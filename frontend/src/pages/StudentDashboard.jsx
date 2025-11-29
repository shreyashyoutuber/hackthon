import React, { useState, useEffect } from 'react'

const gradeFor = (score) => {
  const s = Number(score) || 0
  if (s >= 90) return 'A'
  if (s >= 80) return 'B'
  if (s >= 70) return 'C'
  if (s >= 60) return 'D'
  return 'F'
}

const recommendationFor = (score) => {
  const s = Number(score) || 0
  if (s >= 85) return 'Maintain weekly mocks; Teach peers'
  if (s >= 70) return 'Practice applied problems; weekly revision'
  if (s >= 50) return 'Target weak subtopics; Weekly mini-tests'
  return 'Focused remedial sessions; practice fundamentals'
}

export default function StudentDashboard(){
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '')
  const [fullName, setFullName] = useState(localStorage.getItem('pendingFullName') || '')
  const [subjects, setSubjects] = useState([
    { name: 'Mathematics', score: 75, improvement: 'On Track', recommendation: '' },
    { name: 'Programming', score: 85, improvement: 'On Track', recommendation: '' },
    { name: 'Operating Systems', score: 88, improvement: 'On Track', recommendation: '' }
  ])
  const [reportGenerated, setReportGenerated] = useState(false)
  const [overallComments, setOverallComments] = useState('')

  useEffect(()=>{
    // prefill recommendations
    setSubjects(s => s.map(sub => ({ ...sub, recommendation: recommendationFor(sub.score) })))
  }, [])

  function updateSubject(idx, key, value){
    setSubjects(s => s.map((it,i) => i===idx ? { ...it, [key]: value } : it))
  }

  function addSubject(){
    setSubjects(s => [ ...s, { name: '', score: 0, improvement: '', recommendation: '' } ])
  }

  function removeSubject(idx){
    setSubjects(s => s.filter((_,i)=>i!==idx))
  }

  function generateReport(e){
    e && e.preventDefault()
    // compute recommendations if empty
    setSubjects(s => s.map(it => ({ ...it, recommendation: it.recommendation || recommendationFor(it.score), improvement: it.improvement || (it.score>=70 ? 'On Track' : 'Below Expectations') })))
    setOverallComments(prev => prev || `Average performance; focus on weaker subjects.`)
    setReportGenerated(true)
  }

  function averageScore(){
    if (!subjects.length) return 0
    const sum = subjects.reduce((a,b)=>a + (Number(b.score)||0), 0)
    return Math.round(sum / subjects.length)
  }

  return (
    <div className="student-dashboard">
      {!reportGenerated && (
      <form className="report-form" onSubmit={generateReport}>
        <h2>Create Student Report</h2>
        <div className="row">
          <label>Full name</label>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Student full name" />
        </div>
        <div className="row">
          <label>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@example.com" />
        </div>

        <h3>Subjects</h3>
        {subjects.map((sub, idx) => (
          <div key={idx} className="subject-row">
            <input className="sub-name" value={sub.name} onChange={e=>updateSubject(idx,'name',e.target.value)} placeholder="Subject name" />
            <input className="sub-score" type="number" min="0" max="100" value={sub.score} onChange={e=>updateSubject(idx,'score',e.target.value)} />
            <input className="sub-improve" value={sub.improvement} onChange={e=>updateSubject(idx,'improvement',e.target.value)} placeholder="Improvement Needed" />
            <input className="sub-rec" value={sub.recommendation} onChange={e=>updateSubject(idx,'recommendation',e.target.value)} placeholder="Recommendations" />
            <button type="button" className="btn-sm" onClick={()=>removeSubject(idx)}>Remove</button>
          </div>
        ))}
        <div style={{marginTop:8}}>
          <button type="button" onClick={addSubject}>Add Subject</button>
        </div>

        <div style={{marginTop:12}}>
          <label>Overall comments (optional)</label>
          <textarea value={overallComments} onChange={e=>setOverallComments(e.target.value)} placeholder="Overall comments for the student" />
        </div>

        <div style={{marginTop:12}}>
          <button type="submit">Generate Report</button>
        </div>
      </form>
      )}

      {reportGenerated && (
        <div className="report-preview">
          <div className="report-header">
            <div className="brand">
              <img src="/logo.jpg" alt="Eduwise" className="logo" onError={(e)=>{e.target.style.display='none'}} />
              <div>
                <h1>Performance Report</h1>
                <p className="muted">Personalised summary and next steps</p>
              </div>
            </div>
            <div className="report-meta">
              <div className="average-badge"><div className="avg-num">{averageScore()}%</div><div className="avg-label">Average</div></div>
              <div className="overall-comments"><strong>Overall comments</strong><div>{overallComments}</div></div>
            </div>
          </div>

          <div className="report-body">
            <div className="student-block">
              <h3>Student</h3>
              <div className="student-name">{fullName}</div>
              <div className="student-email">{email}</div>
            </div>

            <h3>Subject Breakdown</h3>
            <table className="subject-table">
              <thead>
                <tr><th>Subject</th><th>Score</th><th>Grade</th><th>Improvement Needed</th><th>Recommendations</th></tr>
              </thead>
              <tbody>
                {subjects.map((s,i)=> (
                  <tr key={i}>
                    <td>{s.name || `Subject ${i+1}`}</td>
                    <td>{s.score}%</td>
                    <td className="grade-cell">{gradeFor(s.score)}</td>
                    <td>{s.improvement}</td>
                    <td>{s.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Top Improvement Areas</h3>
            <div className="improv-list">
              {subjects.map((s,i)=> (
                <div key={i} className="improv-item"><strong>{s.name}:</strong> {s.recommendation}</div>
              ))}
            </div>

            <div style={{marginTop:18}}>
              <button onClick={()=>window.print()}>Print</button>
              <button style={{marginLeft:8}} onClick={()=>setReportGenerated(false)}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
