import { createBrowserRouter, Navigate } from 'react-router';
import { AdminShell } from './guards';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ContactsPage } from '../pages/ContactsPage';
import { LeadsPage } from '../pages/LeadsPage';
import { TasksPage } from '../pages/TasksPage';
import { ProjectsInventoryPage, SalesInventoryPage, RentInventoryPage } from '../pages/ProjectsPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { QuotationsPage } from '../pages/QuotationsPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { ContractsPage } from '../pages/ContractsPage';
import { ContractDetailPage } from '../pages/ContractDetailPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { CommissionsPage } from '../pages/CommissionsPage';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { CampaignsPage } from '../pages/CampaignsPage';
import { AiKnowledgePage } from '../pages/AiKnowledgePage';
import { AgentsPage } from '../pages/AgentsPage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { UsersPage } from '../pages/UsersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ManageAboutPage } from '../pages/ManageAboutPage';

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    path: '/',
    Component: AdminShell,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'contacts', Component: ContactsPage },
      { path: 'leads', Component: LeadsPage },
      { path: 'tasks', Component: TasksPage },
      { path: 'inventory', element: <Navigate to="/inventory/sales" replace /> },
      { path: 'inventory/projects', Component: ProjectsInventoryPage },
      { path: 'inventory/sales', Component: SalesInventoryPage },
      { path: 'inventory/rent', Component: RentInventoryPage },
      { path: 'inventory/:id', Component: ProjectDetailPage },
      { path: 'quotations', Component: QuotationsPage },
      { path: 'reservations', Component: ReservationsPage },
      { path: 'contracts', Component: ContractsPage },
      { path: 'contracts/:id', Component: ContractDetailPage },
      { path: 'invoices', Component: InvoicesPage },
      { path: 'payments', Component: PaymentsPage },
      { path: 'commissions', Component: CommissionsPage },
      { path: 'approvals', Component: ApprovalsPage },
      { path: 'campaigns', Component: CampaignsPage },
      { path: 'ai-knowledge', Component: AiKnowledgePage },
      { path: 'agents', Component: AgentsPage },
      { path: 'documents', Component: DocumentsPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'users', Component: UsersPage },
      { path: 'settings', Component: SettingsPage },
      { path: 'about', Component: ManageAboutPage },
    ],
  },
]);
