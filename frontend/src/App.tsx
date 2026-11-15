import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout, MemberLayout, ConsoleLayout, RequireMember, RequireStaff } from '@/components/layout';
import Home from '@/pages/public/Home';
const m_Knowledge_public = () => import('@/pages/public/Knowledge');
const KnowledgePage = lazy(() => m_Knowledge_public().then((m) => ({ default: m.KnowledgePage })));
const ResourceDetail = lazy(() => m_Knowledge_public().then((m) => ({ default: m.ResourceDetail })));
const Datasets = lazy(() => m_Knowledge_public().then((m) => ({ default: m.Datasets })));
const m_Content_public = () => import('@/pages/public/Content');
const About = lazy(() => m_Content_public().then((m) => ({ default: m.About })));
const Leadership = lazy(() => m_Content_public().then((m) => ({ default: m.Leadership })));
const NewsList = lazy(() => m_Content_public().then((m) => ({ default: m.NewsList })));
const NewsDetail = lazy(() => m_Content_public().then((m) => ({ default: m.NewsDetail })));
const Events = lazy(() => m_Content_public().then((m) => ({ default: m.Events })));
const EventDetail = lazy(() => m_Content_public().then((m) => ({ default: m.EventDetail })));
const Opportunities = lazy(() => m_Content_public().then((m) => ({ default: m.Opportunities })));
const OpportunityDetail = lazy(() => m_Content_public().then((m) => ({ default: m.OpportunityDetail })));
const Contact = lazy(() => m_Content_public().then((m) => ({ default: m.Contact })));
const Policies = lazy(() => m_Content_public().then((m) => ({ default: m.Policies })));
const NotFound = lazy(() => m_Content_public().then((m) => ({ default: m.NotFound })));
const m_Explore_public = () => import('@/pages/public/Explore');
const Organisations = lazy(() => m_Explore_public().then((m) => ({ default: m.Organisations })));
const OrganisationDetail = lazy(() => m_Explore_public().then((m) => ({ default: m.OrganisationDetail })));
const Learn = lazy(() => m_Explore_public().then((m) => ({ default: m.Learn })));
const CollectionPage = lazy(() => m_Explore_public().then((m) => ({ default: m.CollectionPage })));
const Help = lazy(() => m_Explore_public().then((m) => ({ default: m.Help })));
const HelpArticle = lazy(() => m_Explore_public().then((m) => ({ default: m.HelpArticle })));
const NetworkMap = lazy(() => m_Explore_public().then((m) => ({ default: m.NetworkMap })));
const m_Auth_public = () => import('@/pages/public/Auth');
const Join = lazy(() => m_Auth_public().then((m) => ({ default: m.Join })));
const VerifyEmail = lazy(() => m_Auth_public().then((m) => ({ default: m.VerifyEmail })));
const Login = lazy(() => m_Auth_public().then((m) => ({ default: m.Login })));
const ResetPassword = lazy(() => m_Auth_public().then((m) => ({ default: m.ResetPassword })));
const ApplicationStatus = lazy(() => m_Auth_public().then((m) => ({ default: m.ApplicationStatus })));
const m_Dashboard_member = () => import('@/pages/member/Dashboard');
const Dashboard = lazy(() => m_Dashboard_member().then((m) => ({ default: m.Dashboard })));
const Notifications = lazy(() => m_Dashboard_member().then((m) => ({ default: m.Notifications })));
const m_Profile_member = () => import('@/pages/member/Profile');
const Profile = lazy(() => m_Profile_member().then((m) => ({ default: m.Profile })));
const Settings = lazy(() => m_Profile_member().then((m) => ({ default: m.Settings })));
const PrivacyRequests = lazy(() => m_Profile_member().then((m) => ({ default: m.PrivacyRequests })));
const m_People_member = () => import('@/pages/member/People');
const Directory = lazy(() => m_People_member().then((m) => ({ default: m.Directory })));
const MemberPage = lazy(() => m_People_member().then((m) => ({ default: m.MemberPage })));
const Messages = lazy(() => m_People_member().then((m) => ({ default: m.Messages })));
const Conversation = lazy(() => m_People_member().then((m) => ({ default: m.Conversation })));
const m_Submit_member = () => import('@/pages/member/Submit');
const Submit = lazy(() => m_Submit_member().then((m) => ({ default: m.Submit })));
const MySubmissions = lazy(() => m_Submit_member().then((m) => ({ default: m.MySubmissions })));
const m_Community_member = () => import('@/pages/member/Community');
const Community = lazy(() => m_Community_member().then((m) => ({ default: m.Community })));
const ThreadPage = lazy(() => m_Community_member().then((m) => ({ default: m.ThreadPage })));
const Mentorship = lazy(() => m_Community_member().then((m) => ({ default: m.Mentorship })));
const Workspaces = lazy(() => m_Community_member().then((m) => ({ default: m.Workspaces })));
const WorkspacePage = lazy(() => m_Community_member().then((m) => ({ default: m.WorkspacePage })));
const m_Queue_console = () => import('@/pages/console/Queue');
const Queue = lazy(() => m_Queue_console().then((m) => ({ default: m.Queue })));
const Review = lazy(() => m_Queue_console().then((m) => ({ default: m.Review })));
const m_Admin_console = () => import('@/pages/console/Admin');
const ContentAdmin = lazy(() => m_Admin_console().then((m) => ({ default: m.ContentAdmin })));
const Users = lazy(() => m_Admin_console().then((m) => ({ default: m.Users })));
const OrganisationsAdmin = lazy(() => m_Admin_console().then((m) => ({ default: m.OrganisationsAdmin })));
const TaxonomyAdmin = lazy(() => m_Admin_console().then((m) => ({ default: m.TaxonomyAdmin })));
const Reports = lazy(() => m_Admin_console().then((m) => ({ default: m.Reports })));
const Newsletters = lazy(() => m_Admin_console().then((m) => ({ default: m.Newsletters })));
const MentorshipPool = lazy(() => m_Admin_console().then((m) => ({ default: m.MentorshipPool })));
const Audit = lazy(() => m_Admin_console().then((m) => ({ default: m.Audit })));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="leadership" element={<Leadership />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:slug" element={<ResourceDetail />} />
        <Route path="datasets" element={<Datasets />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="news" element={<NewsList />} />
        <Route path="news/:id" element={<NewsDetail />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="opportunities/:id" element={<OpportunityDetail />} />
        <Route path="organisations" element={<Organisations />} />
        <Route path="organisations/:slug" element={<OrganisationDetail />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/:slug" element={<CollectionPage />} />
        <Route path="help" element={<Help />} />
        <Route path="help/:slug" element={<HelpArticle />} />
        <Route path="map" element={<NetworkMap />} />
        <Route path="contact" element={<Contact />} />
        <Route path="policies" element={<Policies />} />
        <Route path="join" element={<Join />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="login" element={<Login />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="application-status" element={<ApplicationStatus />} />

        <Route element={<RequireMember><MemberLayout /></RequireMember>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="privacy-requests" element={<PrivacyRequests />} />
          <Route path="directory" element={<Directory />} />
          <Route path="members/:id" element={<MemberPage />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Conversation />} />
          <Route path="submit" element={<Submit />} />
          <Route path="my-submissions" element={<MySubmissions />} />
          <Route path="community" element={<Community />} />
          <Route path="community/:id" element={<ThreadPage />} />
          <Route path="mentorship" element={<Mentorship />} />
          <Route path="workspaces" element={<Workspaces />} />
          <Route path="workspaces/:id" element={<WorkspacePage />} />
        </Route>

        <Route path="console" element={<RequireStaff><ConsoleLayout /></RequireStaff>}>
          <Route index element={<Queue />} />
          <Route path="review/:id" element={<RequireStaff roles={['reviewer', 'admin']}><Review /></RequireStaff>} />
          <Route path="content" element={<RequireStaff roles={['editor', 'admin']}><ContentAdmin /></RequireStaff>} />
          <Route path="newsletters" element={<RequireStaff roles={['editor', 'admin']}><Newsletters /></RequireStaff>} />
          <Route path="users" element={<RequireStaff roles={['admin']}><Users /></RequireStaff>} />
          <Route path="organisations" element={<RequireStaff roles={['admin']}><OrganisationsAdmin /></RequireStaff>} />
          <Route path="taxonomy" element={<RequireStaff roles={['admin']}><TaxonomyAdmin /></RequireStaff>} />
          <Route path="mentorship" element={<RequireStaff roles={['admin', 'editor', 'reviewer']}><MentorshipPool /></RequireStaff>} />
          <Route path="reports" element={<RequireStaff roles={['admin', 'editor']}><Reports /></RequireStaff>} />
          <Route path="audit" element={<RequireStaff roles={['admin']}><Audit /></RequireStaff>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
