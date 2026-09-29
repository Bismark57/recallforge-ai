import { useState } from 'react'
import Dashboard from './views/Dashboard.jsx'
import ImportView from './views/ImportView.jsx'
import AnalyzeView from './views/AnalyzeView.jsx'
import ConfigureView from './views/ConfigureView.jsx'
import PracticeView from './views/PracticeView.jsx'
import SettingsView from './views/SettingsView.jsx'
import { getSet } from './lib/store.js'

import ReviewView from './views/ReviewView.jsx'
import AccountView from './views/AccountView.jsx'
import PrintExamView from './views/PrintExamView.jsx'

// view: { name, setId? }
// dashboard -> import -> analyze -> configure -> practice ; dashboard -> review ; dashboard -> account
export default function App() {
  const [view, setView] = useState({ name: 'dashboard' })
  const [returnTo, setReturnTo] = useState('dashboard')

  const go = (name, setId) => setView({ name, setId })

  const openSettings = () => {
    setReturnTo(view.name === 'settings' ? 'dashboard' : view.name)
    go('settings', view.setId)
  }
  const backFromSettings = () => go(returnTo, view.setId)

  return (
    <div className="min-h-screen bg-forge-950 text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {view.name === 'dashboard' && (
          <Dashboard
            onNew={() => go('import')}
            onOpen={(id) => {
              const s = getSet(id)
              go(s.questions.length ? 'practice' : s.notes ? 'configure' : 'analyze', id)
            }}
            onSettings={openSettings}
            onReview={() => go('review')}
            onAccount={() => go('account')}
          />
        )}
        {view.name === 'import' && (
          <ImportView onDone={(id) => go('analyze', id)} onBack={() => go('dashboard')} />
        )}
        {view.name === 'analyze' && (
          <AnalyzeView
            setId={view.setId}
            onDone={() => go('configure', view.setId)}
            onBack={() => go('dashboard')}
          />
        )}
        {view.name === 'configure' && (
          <ConfigureView
            setId={view.setId}
            onDone={() => go('practice', view.setId)}
            onBack={() => go('analyze', view.setId)}
          />
        )}
        {view.name === 'practice' && (
          <PracticeView
            setId={view.setId}
            onBack={() => go('dashboard')}
            onAddMore={() => go('configure', view.setId)}
          />
        )}
        {view.name === 'review' && <ReviewView onBack={() => go('dashboard')} />}
        {view.name === 'account' && (
          <AccountView
            onBack={() => go('dashboard')}
            onPrint={(id) => go('print', id)}
          />
        )}
        {view.name === 'print' && (
          <PrintExamView setId={view.setId} onBack={() => go('account')} />
        )}
        {view.name === 'settings' && <SettingsView onBack={backFromSettings} />}
      </div>
    </div>
  )
}
