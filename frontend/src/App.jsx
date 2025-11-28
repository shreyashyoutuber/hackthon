import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import StudentReport from './pages/StudentReport'
import ForgotPassword from './pages/ForgotPassword'

export default function App() {
  return (
    <div>
      <nav className="topnav">
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/student-dashboard">Student</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-report" element={<StudentReport />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </main>
    </div>
  )
}
