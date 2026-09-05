import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Investigations from './pages/Investigations.jsx'
import InvestigationDetail from './pages/InvestigationDetail.jsx'
import Transactions from './pages/Transactions.jsx'
import Evidence from './pages/Evidence.jsx'
import Reports from './pages/Reports.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="investigations" element={<Investigations />} />
        <Route path="investigations/:investigationId" element={<InvestigationDetail />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
