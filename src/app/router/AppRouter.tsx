import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '../shell/HomePage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
