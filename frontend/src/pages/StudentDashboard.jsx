import React from 'react'

export default function StudentDashboard(){
  const email = localStorage.getItem('userEmail') || ''
  return (
    <div className="student-dashboard">
      <h2>Student Dashboard</h2>
      <p>Signed in as <strong>{email}</strong></p>
      <p>This is a placeholder student dashboard page converted to React.</p>
    </div>
  )
}
