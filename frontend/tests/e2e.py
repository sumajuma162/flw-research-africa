"""End-to-end click-through of every major workflow. Prints PASS/FAIL per step."""
import re, sys, os, traceback
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:4173'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
os.makedirs(SHOTS, exist_ok=True)
results, errors = [], []
expect.set_options(timeout=8000)

def step(name):
    def deco(fn):
        def run(page):
            try:
                fn(page); results.append(('PASS', name)); print('PASS', name, flush=True)
            except Exception as e:
                results.append(('FAIL', name)); print('FAIL', name, '→', str(e).split('\n')[0][:300], flush=True)
                try: page.screenshot(path=f'{SHOTS}/FAIL-{re.sub("[^a-z0-9]+", "-", name.lower())}.png', full_page=True)
                except Exception: pass
        run.__name__ = name; return run
    return deco

def demo_login(page, email):
    page.get_by_role('button', name='Open demo tools').click()
    card = page.locator('.card', has_text=email.split('@')[0].capitalize())
    page.get_by_role('dialog').locator('.card').filter(has_text=re.compile(email.split('@')[0], re.I)).get_by_role('button', name='Use').click()
    page.wait_for_url(re.compile('/dashboard'))
    expect(page.get_by_role('heading', level=1)).to_contain_text('Hello')

def sign_out(page):
    page.goto(BASE + '/')
    page.get_by_role('button', name='Account menu').click()
    page.get_by_role('menuitem', name='Sign out').click()
    expect(page.get_by_role('banner').get_by_role('link', name='Sign in')).to_be_visible()
    page.wait_for_timeout(300)

def nav(page, path):
    page.goto(BASE + path); page.wait_for_load_state('networkidle')

# ------------------------------------------------------------------ steps
@step('Home page renders hero video, stats and sections')
def t_home(page):
    nav(page, '/')
    expect(page.get_by_role('heading', level=1)).to_contain_text('Reducing food loss and waste')
    assert page.locator('video').count() == 1
    expect(page.get_by_text('Approved members')).to_be_visible()
    expect(page.get_by_role('heading', name='Featured knowledge')).to_be_visible()
    page.get_by_role('button', name=re.compile('Pause background')).click()
    expect(page.get_by_role('button', name=re.compile('Play background'))).to_be_visible()
    page.screenshot(path=f'{SHOTS}/01-home-desktop.png')
    page.screenshot(path=f'{SHOTS}/01b-home-full.png', full_page=True)

@step('Hero search leads to filtered knowledge hub')
def t_search(page):
    nav(page, '/')
    page.locator('#hero-q').fill('tomato')
    page.get_by_role('button', name='Search', exact=True).click()
    page.wait_for_url(re.compile(r'/knowledge\?q=tomato'))
    expect(page.get_by_text(re.compile(r'results? for “tomato”'))).to_be_visible()
    expect(page.get_by_role('link', name=re.compile('Quantifying tomato losses'))).to_be_visible()

@step('Knowledge filters, URL sync, empty state and pagination')
def t_filters(page):
    nav(page, '/knowledge')
    page.get_by_label('Resource type').select_option('dataset')
    expect(page).to_have_url(re.compile('type=dataset'))
    expect(page.locator('main a[href^="/knowledge/"]').first).to_be_visible()
    page.get_by_label('Country or region').select_option('NG')
    expect(page.get_by_role('link', name=re.compile('cold-room utilisation', re.I))).to_be_visible()
    page.locator('#kq').fill('zzzznotfound')
    expect(page.get_by_text('No resources match')).to_be_visible()
    page.get_by_role('button', name='Clear filters').click()
    page.get_by_role('button', name='Clear search').click()
    expect(page.get_by_text(re.compile(r'^\d+ results'))).to_be_visible()
    page.screenshot(path=f'{SHOTS}/02-knowledge.png')

@step('Resource detail: citation, versions, external link notice, download')
def t_detail(page):
    nav(page, '/knowledge/tomato-losses-arusha-markets')
    expect(page.get_by_role('heading', level=1)).to_contain_text('tomato losses')
    page.get_by_role('button', name='Copy citation').click()
    expect(page.get_by_text(re.compile('Citation (copied|selected)')).first).to_be_visible()
    expect(page.get_by_role('heading', name='Version history')).to_be_visible()
    page.get_by_role('button', name=re.compile('^Download')).click()
    expect(page.get_by_role('dialog')).to_contain_text('tomato-losses-arusha.pdf')
    page.get_by_role('button', name='Done').click()
    nav(page, '/knowledge/east-africa-maize-storage-trials')
    expect(page.get_by_text('Dataset details')).to_be_visible()
    page.get_by_role('button', name='Go to the data source').click()
    expect(page.get_by_role('dialog')).to_contain_text('You are leaving the network site')
    page.get_by_role('button', name='Stay here').click()
    page.screenshot(path=f'{SHOTS}/03-resource-detail.png', full_page=True)

@step('Members-only resource is blocked for visitors; restricted is hidden')
def t_access(page):
    nav(page, '/knowledge/teff-pulse-storage-losses')
    expect(page.get_by_role('heading', name='Members only')).to_be_visible()
    nav(page, '/knowledge/sacred-granary-practices')
    expect(page.get_by_role('heading', name='Not found')).to_be_visible()

@step('Public pages: about, leadership, events (time zones), opportunities, news, orgs, learn, help, map, contact')
def t_public(page):
    nav(page, '/about'); expect(page.get_by_role('heading', name='Objectives')).to_be_visible()
    nav(page, '/leadership'); expect(page.get_by_text('Prof. Lucy Onditi')).to_be_visible()
    nav(page, '/events'); page.get_by_role('link', name=re.compile('Measuring post-harvest losses')).click()
    expect(page.get_by_text(re.compile(r'EAT|UTC\+3')).first).to_be_visible()
    page.get_by_role('button', name='Add to calendar').click(); expect(page.get_by_role('dialog')).to_contain_text('Google Calendar'); page.keyboard.press('Escape')
    nav(page, '/events'); page.get_by_role('tab', name='Past').click(); expect(page.get_by_text('Network launch meeting')).to_be_visible()
    nav(page, '/opportunities'); expect(page.get_by_text('Small grants for post-harvest')).to_be_visible()
    page.get_by_role('button', name='Funding').click(); expect(page.get_by_text('Collaborators wanted')).to_have_count(0)
    nav(page, '/news'); page.get_by_role('link', name=re.compile('Knowledge hub opens')).click(); expect(page.get_by_role('heading', level=1)).to_contain_text('Knowledge hub opens')
    nav(page, '/organisations'); page.get_by_role('link', name=re.compile('ColdLink')).click(); expect(page.get_by_text(re.compile('confirmed members'))).to_be_visible()
    nav(page, '/learn'); page.get_by_role('link', name=re.compile('Measuring food loss in the field')).click(); expect(page.get_by_text('You will be able to')).to_be_visible()
    nav(page, '/help'); page.locator('#hq').fill('password'); expect(page.get_by_role('link', name=re.compile('Resetting your password'))).to_be_visible()
    nav(page, '/map'); page.get_by_role('button', name=re.compile('^Kenya')).click(); expect(page.get_by_role('heading', name='Kenya')).to_be_visible()
    page.screenshot(path=f'{SHOTS}/04-map.png')

@step('Contact form: validation errors then success with reference')
def t_contact(page):
    nav(page, '/contact')
    page.get_by_role('button', name='Send message').click()
    expect(page.get_by_text(re.compile('Please fix these'))).to_be_visible()
    page.get_by_label('Your name').fill('Test Person'); page.get_by_label('Email for our reply').fill('test@example.org')
    page.get_by_label('Subject').fill('Question'); page.get_by_label('Message').fill('I would like to learn more about joining the network.')
    page.get_by_role('button', name='Send message').click()
    expect(page.get_by_role('heading', name='Message sent')).to_be_visible()

@step('Join wizard → verify email via demo inbox → application status')
def t_join(page):
    nav(page, '/join')
    page.get_by_role('button', name='Continue').click()
    expect(page.get_by_text('Enter your full name.').first).to_be_visible()
    page.locator('#f-name').fill('Zawadi Test'); page.locator('#f-email').fill('zawadi@example.org'); page.locator('#f-password').fill('mango-season-2026')
    page.get_by_role('button', name='Continue').click()
    page.get_by_label('Country where you mainly work').select_option('KE'); page.get_by_text('Student', exact=True).click()
    page.get_by_role('button', name='Continue').click()
    page.get_by_role('button', name='Cold chain').click(); page.get_by_role('button', name='Continue').click()
    page.get_by_role('button', name='Send application').click()
    expect(page.get_by_text(re.compile('You must agree')).first).to_be_visible()
    page.get_by_text(re.compile('I agree to the')).click()
    page.get_by_role('button', name='Send application').click()
    expect(page.get_by_role('heading', name='Check your email')).to_be_visible()
    page.get_by_role('button', name='Open demo tools').click()
    page.get_by_role('tab', name=re.compile('Email and SMS inbox')).click()
    page.get_by_role('dialog').get_by_role('button', name='Verify email').first.click()
    expect(page.get_by_role('heading', name='Email confirmed')).to_be_visible()
    nav(page, '/login')
    page.get_by_label('Email').fill('zawadi@example.org'); page.get_by_label('Password', exact=True).fill('mango-season-2026')
    page.get_by_role('button', name='Sign in').click()
    page.wait_for_url(re.compile('/application-status'))
    expect(page.get_by_role('heading', name='Your application')).to_be_visible()
    nav(page, '/dashboard'); page.wait_for_url(re.compile('/application-status'))
    sign_out(page)

@step('Login errors: wrong password then MFA for staff (Joseph) and console access')
def t_login_mfa(page):
    nav(page, '/login')
    page.get_by_label('Email').fill('joseph@demo.flw'); page.get_by_label('Password', exact=True).fill('wrong-password-1')
    page.get_by_role('button', name='Sign in').click()
    expect(page.get_by_text('Email or password is incorrect.')).to_be_visible()
    page.get_by_label('Password', exact=True).fill('harvest-2026'); page.get_by_role('button', name='Sign in').click()
    expect(page.get_by_role('heading', name='Two-step sign-in')).to_be_visible()
    page.get_by_label('Code').fill('111111'); page.get_by_role('button', name='Verify and sign in').click()
    expect(page.get_by_text(re.compile('That code is not correct')).first).to_be_visible()
    page.get_by_label('Code').fill('246810'); page.get_by_role('button', name='Verify and sign in').click()
    page.wait_for_url(re.compile('/dashboard'))
    nav(page, '/console')
    expect(page.get_by_role('heading', name='Queue')).to_be_visible()
    page.screenshot(path=f'{SHOTS}/05-console-queue.png')

@step('Reviewer approves the new application (Zawadi)')
def t_approve(page):
    nav(page, '/console?tab=applications')
    page.locator('li', has_text='Zawadi Test').get_by_role('button', name='Open').click()
    page.get_by_role('button', name='Approve').click()
    expect(page.get_by_text('Decision recorded').first).to_be_visible()

@step('Reviewer cannot be the author; accepts community knowledge only after IK check')
def t_review(page):
    nav(page, '/console?tab=submissions')
    page.locator('li', has_text='Clay pot seed storage').get_by_role('button', name='Open').click()
    expect(page.get_by_role('heading', name='Community permission')).to_be_visible()
    accept = page.get_by_role('button', name='Accept and publish')
    for lbl in ['Provenance is clear', 'Rights allow sharing', 'Visibility is appropriate']: page.get_by_text(lbl).click()
    expect(accept).to_be_disabled()
    page.get_by_text('Community permission confirmed').click()
    expect(accept).to_be_enabled()
    page.screenshot(path=f'{SHOTS}/06-review.png', full_page=True)
    accept.click(); expect(page.get_by_text('Decision recorded and the contributor notified').first).to_be_visible()
    nav(page, '/knowledge/clay-pot-seed-storage')
    expect(page.get_by_text('Confirmed by a network reviewer')).to_be_visible()

@step('Moderator resolves a conduct report (removes spam)')
def t_report(page):
    nav(page, '/console?tab=reports')
    page.locator('li', has_text='Spam or advertising').get_by_role('button', name='Open').click()
    expect(page.get_by_role('dialog')).to_contain_text('Buy cheap bags')
    page.get_by_label('What did you decide and why?').fill('Promotional spam, breaks conduct rules.')
    page.get_by_role('button', name='Remove content').click()
    expect(page.get_by_text('Decision recorded').first).to_be_visible(); page.wait_for_timeout(400)
    nav(page, '/community/t02'); expect(page.get_by_text('This post was removed by a moderator.')).to_be_visible()
    sign_out(page)

@step('Member (Amina): dashboard, returned submission is revised and resubmitted')
def t_amina_revise(page):
    nav(page, '/'); demo_login(page, 'amina@demo.flw')
    expect(page.get_by_text(re.compile('needs changes'))).to_be_visible()
    page.get_by_role('link', name='Revise it now').click()
    expect(page.get_by_text('The reviewer asked for changes')).to_be_visible()
    page.get_by_role('button', name='Continue').click()
    expect(page.get_by_label('Rights statement')).to_be_visible()
    page.get_by_role('button', name='Continue').click()
    expect(page.get_by_text(re.compile('Please fix'))).to_be_visible()
    page.get_by_label('Data custodian').fill('Lake Zone Post-Harvest Institute')
    page.get_by_label('Collection period').fill('Jan 2026 – Mar 2026')
    page.get_by_label('Licence or access conditions').fill('Open under CC BY 4.0')
    page.get_by_label('Rights statement').select_option('CC BY 4.0')
    page.get_by_role('button', name='Continue').click()
    page.get_by_role('button', name='Submit for review').click()
    page.wait_for_url(re.compile('/my-submissions'))
    expect(page.locator('li', has_text='Tomato crate temperature logs')).to_contain_text('In review')

@step('Member submits a new publication using DOI lookup')
def t_submit(page):
    nav(page, '/submit')
    page.get_by_text('Publication', exact=True).click(); page.get_by_role('button', name='Continue').click()
    page.get_by_label('DOI').fill('10.5555/nope'); page.get_by_role('button', name='Look up').click()
    expect(page.get_by_text(re.compile('could not find that DOI')).first).to_be_visible()
    page.get_by_label('DOI').fill('10.5555/flw.2026.001'); page.get_by_role('button', name='Look up').click()
    expect(page.get_by_label('Title')).to_have_value(re.compile('leafy vegetables'))
    page.get_by_role('button', name='Continue').click()
    page.get_by_label('Rights statement').select_option('CC BY 4.0')
    page.get_by_role('button', name='Continue').click()
    expect(page.get_by_text('After you submit, you cannot approve your own resource')).to_be_visible()
    page.screenshot(path=f'{SHOTS}/07-submit-review-step.png', full_page=True)
    page.get_by_role('button', name='Submit for review').click()
    page.wait_for_url(re.compile('/my-submissions'))
    expect(page.locator('li', has_text='leafy vegetables').first).to_contain_text('In review')
    page.get_by_role('tab', name=re.compile('Usage')).click()
    expect(page.get_by_text('Views per month')).to_be_visible()

@step('File upload validation rejects wrong type')
def t_upload(page):
    nav(page, '/submit')
    page.get_by_text('Tool', exact=True).click(); page.get_by_role('button', name='Continue').click()
    page.get_by_label('Title').fill('Upload validation test tool')
    page.get_by_label('Summary').fill('A short summary that is long enough to pass the forty character rule.')
    page.get_by_label('Authors').fill('A. Mwakyusa'); page.get_by_label('Countries or regions covered').select_option('TZ')
    page.get_by_role('button', name='Storage').click(); page.get_by_role('button', name='Continue').click()
    page.get_by_text('Upload a file').click()
    page.locator('input[type=file]').set_input_files({'name': 'virus.exe', 'mimeType': 'application/octet-stream', 'buffer': b'MZ'})
    expect(page.get_by_text(re.compile(r'Files of type \.exe are not accepted')).first).to_be_visible()
    page.locator('input[type=file]').set_input_files({'name': 'tool.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4'})
    expect(page.get_by_text('tool.pdf')).to_be_visible()

@step('Community: start a discussion, reply, report a post')
def t_community(page):
    nav(page, '/community')
    page.get_by_role('button', name='Start a discussion').click()
    page.get_by_role('dialog').get_by_label('Title').fill('Which crates reduce tomato bruising most?')
    page.get_by_role('dialog').get_by_label('Topic').select_option('post_harvest')
    page.get_by_role('dialog').get_by_label('Message').fill('We are comparing plastic and wooden crates. Has anyone measured the difference?')
    page.get_by_role('button', name='Post discussion').click()
    expect(page.get_by_role('heading', level=1)).to_contain_text('Which crates')
    page.get_by_label('Your reply').fill('Adding our first results next week.'); page.get_by_role('button', name='Post reply').click()
    expect(page.get_by_text('Adding our first results next week.')).to_be_visible()
    nav(page, '/community/t01')
    page.get_by_role('button', name='Report this post').first.click()
    page.get_by_role('dialog').get_by_role('button', name='Send report').click()
    expect(page.get_by_text(re.compile('A moderator will review')).first).to_be_visible()

@step('Messaging: accept connection request, send a message')
def t_messages(page):
    nav(page, '/messages')
    page.locator('li', has_text='Neema Mollel').get_by_role('button', name='Accept').click()
    expect(page.get_by_role('link', name=re.compile('Neema Mollel')).first).to_be_visible()
    page.locator('a[href^="/messages/"]', has_text='Neema').first.click()
    page.locator('#msg').fill('Karibu Neema! Happy to connect.'); page.keyboard.press('Enter')
    expect(page.get_by_text('Karibu Neema! Happy to connect.')).to_be_visible()
    page.screenshot(path=f'{SHOTS}/08-conversation.png')

@step('Profile visibility and preview; settings toggles; workspace note; learning progress')
def t_profile(page):
    nav(page, '/profile')
    page.get_by_role('button', name='Save profile').click(); expect(page.get_by_text(re.compile('Profile saved')).first).to_be_visible()
    page.get_by_role('button', name='Preview as others see me').click(); expect(page.get_by_role('dialog')).to_contain_text('Amina Mwakyusa'); page.keyboard.press('Escape')
    nav(page, '/settings?tab=notifications'); page.get_by_role('switch', name='Event announcements').click(); expect(page.get_by_text('Unsubscribed').first).to_be_visible()
    nav(page, '/settings?tab=appearance'); page.get_by_text('dark', exact=True).click(); page.wait_for_timeout(300)
    assert 'dark' in (page.locator('html').get_attribute('class') or '')
    nav(page, '/dashboard'); page.screenshot(path=f'{SHOTS}/09-dashboard-dark.png', full_page=True)
    nav(page, '/settings?tab=appearance'); page.get_by_text('light', exact=True).click()
    nav(page, '/workspaces/w1'); page.get_by_label('New note').fill('Site visit planned for March.'); page.get_by_role('button', name='Add', exact=True).last.click()
    expect(page.get_by_text('Site visit planned for March.')).to_be_visible()
    nav(page, '/learn/measuring-food-loss'); page.get_by_role('button', name=re.compile('Mark “Food loss and waste: key definitions” as done')).click()
    expect(page.get_by_text(re.compile('1 of 4 complete'))).to_be_visible()
    nav(page, '/privacy-requests'); page.get_by_role('button', name='Export my data now').click(); expect(page.get_by_role('dialog')).to_contain_text('exportedAt'); page.keyboard.press('Escape')
    sign_out(page)

@step('Admin (Grace): approve resubmission, roles, taxonomy, content publish, newsletter, reports, audit')
def t_admin(page):
    nav(page, '/'); demo_login(page, 'grace@demo.flw')
    nav(page, '/console?tab=submissions')
    page.locator('li', has_text='Tomato crate temperature logs').get_by_role('button', name='Open').click()
    for lbl in ['Provenance is clear', 'Rights allow sharing', 'Visibility is appropriate']: page.get_by_text(lbl).click()
    page.get_by_role('button', name='Accept and publish').click(); expect(page.get_by_text('Decision recorded and the contributor notified').first).to_be_visible()
    nav(page, '/console/users'); page.locator('tr', has_text='Tendai Moyo').get_by_role('button', name='Roles').click()
    page.get_by_role('dialog').get_by_text('Reviewer', exact=True).click(); page.get_by_label('Reason for this change').fill('Joining review panel')
    page.get_by_role('button', name='Save roles').click(); expect(page.locator('tr', has_text='Tendai Moyo')).to_contain_text('Reviewer')
    page.locator('tr', has_text='Grace Achieng').get_by_role('button', name='Roles').click()
    page.get_by_role('dialog').get_by_text('Administrator', exact=True).click(); page.get_by_label('Reason for this change').fill('Testing last admin rule')
    page.get_by_role('button', name='Save roles').click(); expect(page.get_by_text('You cannot remove the last active administrator.').first).to_be_visible(); page.keyboard.press('Escape')
    nav(page, '/console/taxonomy'); page.get_by_label('New term').fill('Food safety'); page.get_by_role('button', name='Add', exact=True).click(); expect(page.get_by_role('cell', name='Food safety', exact=True)).to_be_visible()
    nav(page, '/console/content'); page.get_by_label('Vision text').fill('Sustainable, resilient and fair African food systems, strengthened through research, innovation and collaboration.')
    page.get_by_role('button', name='Save draft').click(); page.get_by_role('button', name='Publish draft').click(); expect(page.get_by_text(re.compile('Published. The public page')).first).to_be_visible()
    nav(page, '/about'); expect(page.get_by_text('Sustainable, resilient and fair')).to_be_visible()
    nav(page, '/console/newsletters'); page.get_by_label('Subject').fill('November update'); page.get_by_label('Message').fill('Highlights from the network this month, including new datasets.')
    page.get_by_role('button', name='Review and send').click(); page.get_by_role('button', name='Send newsletter').click(); expect(page.get_by_text(re.compile(r'Sent to \d+ subscribers')).first).to_be_visible()
    nav(page, '/console/reports'); expect(page.get_by_text('Activity by month')).to_be_visible(); page.wait_for_timeout(500); page.screenshot(path=f'{SHOTS}/10-reports.png', full_page=True)
    nav(page, '/console/audit'); expect(page.get_by_role('cell', name='user.roles').first).to_be_visible()
    nav(page, '/console/content'); page.get_by_role('tab', name='Events').click(); page.get_by_role('button', name='New event').click()
    page.get_by_role('dialog').get_by_label('Title').fill('Test event end before start')
    page.get_by_label('Starts (your local time)').fill('2026-12-10T10:00'); page.get_by_label('Ends (your local time)').fill('2026-12-10T09:00')
    page.get_by_role('button', name='Save event').click(); expect(page.get_by_text('The event cannot end before it starts.').first).to_be_visible()
    sign_out(page)

@step('Suspended member cannot sign in; session idle timeout signs out')
def t_suspend(page):
    nav(page, '/login'); page.get_by_label('Email').fill('peter@demo.flw'); page.get_by_label('Password', exact=True).fill('harvest-2026'); page.get_by_role('button', name='Sign in').click()
    expect(page.get_by_text('This account is suspended.', exact=False).first).to_be_visible()
    nav(page, '/'); demo_login(page, 'kwame@demo.flw')
    page.get_by_role('button', name='Open demo tools').click(); page.get_by_role('button', name='Simulate 30 min idle').click(); expect(page.get_by_text(re.compile('Session idle time set')).first).to_be_visible(); page.keyboard.press('Escape')
    nav(page, '/dashboard'); page.wait_for_url(re.compile('/login'))
    expect(page.get_by_role('heading', name='Sign in')).to_be_visible()

def mobile_suite(browser):
    ctx = browser.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append(f'mobile pageerror: {e}'))
    @step('Mobile: no horizontal overflow on key pages; drawer, filter sheet, bottom tabs')
    def t_mobile(page):
        for p in ['/', '/knowledge', '/knowledge/tomato-losses-arusha-markets', '/events', '/join', '/map', '/about', '/learn', '/contact']:
            nav(page, p)
            w = page.evaluate('document.documentElement.scrollWidth'); assert w <= 376, f'{p} overflows: {w}px'
        nav(page, '/'); page.screenshot(path=f'{SHOTS}/11-mobile-home.png'); page.screenshot(path=f'{SHOTS}/11b-mobile-home-full.png', full_page=True)
        page.get_by_role('button', name='Open menu').click(); expect(page.get_by_role('dialog', name='Menu')).to_be_visible(); page.screenshot(path=f'{SHOTS}/12-mobile-menu.png'); page.keyboard.press('Escape')
        nav(page, '/knowledge'); page.get_by_role('button', name='Filters').click(); expect(page.get_by_role('dialog', name='Filters')).to_be_visible(); page.screenshot(path=f'{SHOTS}/13-mobile-filters.png'); page.keyboard.press('Escape')
        demo_login(page, 'amina@demo.flw')
        expect(page.get_by_role('navigation', name='Member')).to_be_visible()
        for p in ['/dashboard', '/submit', '/messages', '/profile', '/console']:
            nav(page, p); w = page.evaluate('document.documentElement.scrollWidth'); assert w <= 376, f'{p} overflows: {w}px'
        nav(page, '/dashboard'); page.screenshot(path=f'{SHOTS}/14-mobile-dashboard.png', full_page=True)
    t_mobile(page); ctx.close()

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1366, 'height': 860})
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin=BASE)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'console {m.type}: {m.text}') if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    for t in [t_home, t_search, t_filters, t_detail, t_access, t_public, t_contact, t_join, t_login_mfa, t_approve, t_review, t_report, t_amina_revise, t_submit, t_upload, t_community, t_messages, t_profile, t_admin, t_suspend]:
        t(page)
    ctx.close()
    mobile_suite(browser)
    browser.close()

print('\n==== SUMMARY ====')
print(f"{sum(1 for r in results if r[0]=='PASS')}/{len(results)} passed")
for r in results:
    if r[0] == 'FAIL': print('FAILED:', r[1])
print('JS errors:', len(errors)); [print('  ', e[:300]) for e in errors[:20]]
