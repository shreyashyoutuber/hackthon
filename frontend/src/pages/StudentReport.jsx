import React, { useEffect, useState } from 'react'

export default function StudentReport(){
  const [profile, setProfile] = useState(null)
  useEffect(()=>{
    const email = localStorage.getItem('userEmail')
    if (!email) return
    fetch('/api/my-profile', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
      .then(r=>r.json()).then(j=>{ if (j.success) setProfile(j) })
  },[])

  if (!profile) return <p>Loading profile...</p>

  return (
    <div className="report">
      <h2>Student Report — {profile.fullName}</h2>
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>School ID:</strong> {profile.schoolId}</p>
      <h3>Grades</h3>
      <pre>{JSON.stringify(profile.grades, null, 2)}</pre>
      <h3>Interview Report</h3>
      <p>{profile.interviewReport || 'No report available.'}</p>
    </div>
  )
}
