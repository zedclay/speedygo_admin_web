import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from '../../components/layout/AdminShell'
import { LoginPage } from '../../features/auth/LoginPage'
import { LogoutPage } from '../../features/auth/LogoutPage'
import { DashboardPage } from '../../features/dashboard/DashboardPage'
import { OperationsPage } from '../../features/orders/OperationsPage'
import { OrdersListPage } from '../../features/orders/OrdersListPage'
import { OrderDetailPage } from '../../features/orders/OrderDetailPage'
import { OrderQueuePage } from '../../features/orders/OrderQueuePage'
import { MerchantsListPage } from '../../features/merchants/MerchantsListPage'
import { MerchantDetailPage } from '../../features/merchants/MerchantDetailPage'
import { MerchantVerificationQueuePage } from '../../features/merchants/MerchantVerificationQueuePage'
import { MerchantVerificationReviewPage } from '../../features/merchants/MerchantVerificationReviewPage'
import { DriversListPage } from '../../features/drivers/DriversListPage'
import { DriverDetailPage } from '../../features/drivers/DriverDetailPage'
import { DriverVerificationQueuePage } from '../../features/drivers/DriverVerificationQueuePage'
import { DriverVerificationReviewPage } from '../../features/drivers/DriverVerificationReviewPage'
import { CustomersListPage } from '../../features/customers/CustomersListPage'
import { CustomerDetailPage } from '../../features/customers/CustomerDetailPage'
import { CollectionsHubPage } from '../../features/payments/CollectionsHubPage'
import { CodRemittancesPage } from '../../features/payments/CodRemittancesPage'
import { CodDriverSummaryDetailPage } from '../../features/payments/CodDriverSummaryDetailPage'
import { CodRemittanceDetailPage } from '../../features/payments/CodRemittanceDetailPage'
import { PaymentsListPage } from '../../features/payments/PaymentsListPage'
import { PaymentDetailPage } from '../../features/payments/PaymentDetailPage'
import { RefundsPage } from '../../features/payments/RefundsPage'
import { RefundDetailPage } from '../../features/payments/RefundDetailPage'
import { SettlementsPage } from '../../features/payments/SettlementsPage'
import { ZonesPage } from '../../features/geo/ZonesPage'
import { PromotionsPage } from '../../features/promotions/PromotionsPage'
import { PromotionDetailPage } from '../../features/promotions/PromotionDetailPage'
import { ReportsHubPage } from '../../features/reports/ReportsHubPage'
import { AdministrationPage } from '../../features/administration/AdministrationPage'
import { AdminsListPage } from '../../features/administration/AdminsListPage'
import { AdminCreatePage } from '../../features/administration/AdminCreatePage'
import { AdminEditPage } from '../../features/administration/AdminEditPage'
import { AdminDetailPage } from '../../features/administration/AdminDetailPage'
import { RolesListPage } from '../../features/administration/RolesListPage'
import { RoleDetailPage } from '../../features/administration/RoleDetailPage'
import { RoleEditPage } from '../../features/administration/RoleEditPage'
import { TemplatesListPage } from '../../features/administration/TemplatesListPage'
import { TemplateEditPage } from '../../features/administration/TemplateEditPage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { LanguageSettingsPage } from '../../features/settings/LanguageSettingsPage'
import { MaintenancePage } from '../../features/settings/MaintenancePage'
import { SupportQueuePage } from '../../features/support/SupportQueuePage'
import { SupportTicketPage } from '../../features/support/SupportTicketPage'
import { ProfilePage } from '../../features/profile/ProfilePage'
import { SearchPage } from '../../features/search/SearchPage'
import { NotificationsPage } from '../../features/notifications/NotificationsPage'
import { HelpPage } from '../../features/help/HelpPage'
import { useSessionStore } from '../../lib/auth/sessionStore'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  const hydrate = useSessionStore((s) => s.hydrate)
  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route
              path="orders/queues/delayed"
              element={<OrderQueuePage kind="delayed" />}
            />
            <Route
              path="orders/queues/unassigned"
              element={<OrderQueuePage kind="unassigned" />}
            />
            <Route
              path="orders/queues/failure"
              element={<OrderQueuePage kind="failure" />}
            />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="merchants" element={<MerchantsListPage />} />
            <Route
              path="merchants/verification"
              element={<MerchantVerificationQueuePage />}
            />
            <Route path="merchants/:id" element={<MerchantDetailPage />} />
            <Route
              path="merchants/:id/verification"
              element={<MerchantVerificationReviewPage />}
            />
            <Route path="drivers" element={<DriversListPage />} />
            <Route
              path="drivers/verification"
              element={<DriverVerificationQueuePage />}
            />
            <Route
              path="drivers/:id/verification"
              element={<DriverVerificationReviewPage />}
            />
            <Route path="drivers/:id" element={<DriverDetailPage />} />
            <Route path="customers" element={<CustomersListPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="collections" element={<CollectionsHubPage />}>
              <Route index element={<Navigate to="cod" replace />} />
              <Route path="cod" element={<CodRemittancesPage />} />
              <Route
                path="cod/drivers/:driverId"
                element={<CodDriverSummaryDetailPage />}
              />
              <Route
                path="cod/remittances/:id"
                element={<CodRemittanceDetailPage />}
              />
              <Route
                path="cod/:id"
                element={<CodRemittanceDetailPage />}
              />
              <Route path="payments" element={<PaymentsListPage />} />
              <Route path="payments/:id" element={<PaymentDetailPage />} />
              <Route path="refunds" element={<RefundsPage />} />
              <Route path="refunds/:id" element={<RefundDetailPage />} />
              <Route path="settlements" element={<SettlementsPage />} />
            </Route>
            <Route path="geo/zones" element={<ZonesPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="promotions/:id" element={<PromotionDetailPage />} />
            <Route path="reports" element={<ReportsHubPage />} />
            <Route path="administration" element={<AdministrationPage />} />
            <Route path="administration/admins" element={<AdminsListPage />} />
            <Route
              path="administration/admins/new"
              element={<AdminCreatePage />}
            />
            <Route
              path="administration/admins/preview"
              element={<Navigate to="/administration/admins" replace />}
            />
            <Route
              path="administration/admins/edit"
              element={<Navigate to="/administration/admins" replace />}
            />
            <Route
              path="administration/admins/:id/edit"
              element={<AdminEditPage />}
            />
            <Route
              path="administration/admins/:id"
              element={<AdminDetailPage />}
            />
            <Route path="administration/roles" element={<RolesListPage />} />
            <Route
              path="administration/roles/preview/edit"
              element={<Navigate to="/administration/roles" replace />}
            />
            <Route
              path="administration/roles/preview"
              element={<Navigate to="/administration/roles" replace />}
            />
            <Route
              path="administration/roles/:id/edit"
              element={<RoleEditPage />}
            />
            <Route
              path="administration/roles/:id"
              element={<RoleDetailPage />}
            />
            <Route
              path="administration/templates"
              element={<TemplatesListPage />}
            />
            <Route
              path="administration/templates/preview/edit"
              element={<Navigate to="/administration/templates" replace />}
            />
            <Route
              path="administration/templates/:id"
              element={<TemplateEditPage />}
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/language" element={<LanguageSettingsPage />} />
            <Route path="settings/maintenance" element={<MaintenancePage />} />
            <Route path="support" element={<SupportQueuePage />} />
            <Route path="support/:id" element={<SupportTicketPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="logout" element={<LogoutPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
