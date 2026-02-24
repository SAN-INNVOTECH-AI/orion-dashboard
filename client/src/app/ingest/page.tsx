'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Link, Upload, Play, CheckCircle, Loader2, ChevronRight } from 'lucide-react'
import api from '@/lib/api'

type InputMode = 'text' | 'url' | 'file'

const PHASES = [
  { phase: 1, name: 'Discovery',    icon: '🔍', agents: ['Business Analyst'] },
  { phase: 2, name: 'Design',       icon: '🎨', agents: ['UI/UX Designer'] },
  { phase: 3, name: 'Architecture', icon: '🏗️', agents: ['System Integrator', 'DB Admin'] },
  { phase: 4, name: 'Development',  icon: '💻', agents: ['Mobile Developer', 'Web Developer'] },
  { phase: 5, name: 'Quality',      icon: '🧪', agents: ['QA Engineer', 'Security', 'Performance'] },
  { phase: 6, name: 'Launch',       icon: '🚀', agents: ['DevOps', 'Docs', 'Copywriting'] },
  { phase: 7, name: 'Review',       icon: '📋', agents: ['PM Agent'] },
]

export default function IngestPage() {
  const router = useRouter()
  const [mode, setMode] = useState<InputMode>('text')
  const [projectName, setProjectName] = useState('')
  const [docText, setDocText] = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [nameError, setNameError] = useState('')
  const [docError, setDocError] = useState('')

  const [step, setStep] = useState<'input' | 'ingesting' | 'ingested' | 'executing' | 'done'>('input')
  const [projectId, setProjectId] = useState('')
  const [ingestResult, setIngestResult] = useState<{ tasks_created: number; phases: number } | null>(null)
  const [execLog, setExecLog] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState(0)
  const [error, setError] = useState('')

  const validate = () => {
    let ok = true
    if (!projectName.trim()) { setNameError('Project name is required'); ok = false }
    if (mode === 'text' && !docText.trim()) { setDocError('Please paste your document'); ok = false }
    if (mode === 'url' && !googleUrl.trim()) { setDocError('Please enter a Google Doc URL'); ok = false }
    if (mode === 'file' && !file) { setDocError('Please upload a file'); ok = false }
    return ok
  }

  const handleIngest = async () => {
    if (!validate()) return
    setError('')
    setStep('ingesting')

    try {
      let body: Record<string, string> = { name: projectName }

      if (mode === 'text') {
        body.document_text = docText
      } else if (mode === 'url') {
        body.google_doc_url = googleUrl
      } else if (file) {
        const buf = await file.arrayBuffer()
        body.document_base64 = Buffer.from(buf).toString('base64')
        body.document_type = file.name.endsWith('.pdf') ? 'pdf' : 'docx'
      }

      const res = await api.post('/pm-agent/ingest', body)
      setProjectId(res.data.data.project_id)
      setIngestResult({ tasks_created: res.data.data.tasks_created, phases: res.data.data.phases })
      setStep('ingested')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ingest failed'
      setError(msg)
      setStep('input')
    }
  }

  const handleExecute = async () => {
    setStep('executing')
    setExecLog([`Starting execution for "${projectName}"...`])

    // Start execution
    api.post(`/pm-agent/execute/${projectId}`).catch(() => {})

    // Listen to SSE for live updates
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const es = new EventSource(`${apiBase}/live-progress`)

    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'phase_start') {
          setCurrentPhase(d.phase)
          setExecLog(prev => [...prev, `Phase ${d.phase}: ${d.phase_name} started (${d.task_count} tasks)`])
        } else if (d.type === 'task_start') {
          setExecLog(prev => [...prev, `  ${d.agent} working on: ${d.title}`])
        } else if (d.type === 'task_done') {
          setExecLog(prev => [...prev, `  Done: ${d.title}`])
        } else if (d.type === 'phase_done') {
          setExecLog(prev => [...prev, `Phase ${d.phase} complete.`])
        } else if (d.type === 'execution_done') {
          setExecLog(prev => [...prev, 'All phases complete! Project is ready.'])
          setStep('done')
          es.close()
        } else if (d.type === 'execution_error') {
          setExecLog(prev => [...prev, `Error: ${d.error}`])
          setError(d.error)
          es.close()
        }
      } catch {}
    }
  }

  return (
    <AppLayout title="Start New Project">
      <div className="max-w-3xl mx-auto">

        {/* Phase pipeline overview */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {PHASES.map((p, i) => (
            <div key={p.phase} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex flex-col items-center px-3 py-2 rounded-lg text-center transition-all ${
                currentPhase === p.phase
                  ? 'bg-orion-accent/20 border border-orion-accent'
                  : currentPhase > p.phase
                  ? 'bg-green-500/10 border border-green-500/30 opacity-70'
                  : 'bg-orion-card border border-orion-border opacity-50'
              }`}>
                <span className="text-lg">{p.icon}</span>
                <span className="text-orion-text text-xs font-medium mt-0.5">{p.name}</span>
                <span className="text-orion-muted text-xs">{p.agents.length} agent{p.agents.length > 1 ? 's' : ''}</span>
              </div>
              {i < PHASES.length - 1 && <ChevronRight className="w-3 h-3 text-orion-border flex-shrink-0" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Input */}
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="bg-orion-card border border-orion-border rounded-2xl p-6 space-y-5">
                <div>
                  <h2 className="text-orion-text font-semibold text-lg">Project Details</h2>
                  <p className="text-orion-muted text-sm mt-1">Give your project a name and paste the document. Claude will read it and assign tasks to all 16 agents.</p>
                </div>

                <Input
                  label="Project Name *"
                  value={projectName}
                  onChange={(e) => { setProjectName(e.target.value); setNameError('') }}
                  error={nameError}
                  showValid
                  placeholder="e.g. Mobile App Redesign"
                />

                {/* Doc input mode tabs */}
                <div>
                  <label className="text-orion-muted text-sm font-medium block mb-2">Document Source</label>
                  <div className="flex gap-2 mb-3">
                    {([
                      { key: 'text', label: 'Paste Text', icon: FileText },
                      { key: 'url',  label: 'Google Doc',  icon: Link },
                      { key: 'file', label: 'Upload File', icon: Upload },
                    ] as const).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => { setMode(key); setDocError('') }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${
                          mode === key
                            ? 'bg-orion-accent/15 border-orion-accent text-orion-accent'
                            : 'bg-orion-darker border-orion-border text-orion-muted hover:text-orion-text'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {mode === 'text' && (
                    <textarea
                      value={docText}
                      onChange={(e) => { setDocText(e.target.value); setDocError('') }}
                      rows={10}
                      placeholder="Paste your project document, PRD, brief, or requirements here..."
                      className={`w-full bg-orion-darker border rounded-xl px-4 py-3 text-orion-text placeholder-orion-muted/50 text-sm focus:outline-none resize-none transition-colors ${
                        docError ? 'border-orion-danger' : 'border-orion-border focus:border-orion-accent'
                      }`}
                    />
                  )}
                  {mode === 'url' && (
                    <Input
                      value={googleUrl}
                      onChange={(e) => { setGoogleUrl(e.target.value); setDocError('') }}
                      error={docError}
                      placeholder="https://docs.google.com/document/d/..."
                    />
                  )}
                  {mode === 'file' && (
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      docError ? 'border-orion-danger' : 'border-orion-border hover:border-orion-accent/50'
                    }`}>
                      <Upload className="w-8 h-8 text-orion-muted mx-auto mb-2" />
                      <p className="text-orion-muted text-sm mb-3">Drop a PDF or Word file here</p>
                      <label className="cursor-pointer bg-orion-accent hover:bg-orion-accent-hover text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        Browse File
                        <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setDocError('') }} />
                      </label>
                      {file && <p className="text-green-400 text-xs mt-3">{file.name} selected</p>}
                    </div>
                  )}
                  {docError && mode !== 'url' && <p className="text-orion-danger text-xs mt-1">{docError}</p>}
                </div>

                {error && (
                  <div className="bg-orion-danger/10 border border-orion-danger/30 rounded-lg px-4 py-3 text-orion-danger text-sm">{error}</div>
                )}

                <Button variant="primary" onClick={handleIngest} className="w-full py-3">
                  <FileText className="w-4 h-4" />
                  Analyze Document and Create Tasks
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP: Ingesting */}
          {step === 'ingesting' && (
            <motion.div key="ingesting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20 gap-4">
              <Loader2 className="w-12 h-12 text-orion-accent animate-spin" />
              <p className="text-orion-text font-semibold text-lg">Claude is reading the document...</p>
              <p className="text-orion-muted text-sm">Creating tasks for all 16 agents. This takes 15-30 seconds.</p>
            </motion.div>
          )}

          {/* STEP 2: Ingested — confirm before running */}
          {step === 'ingested' && ingestResult && (
            <motion.div key="ingested" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="bg-orion-card border border-orion-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-orion-text font-semibold text-lg">Document Analyzed</h2>
                    <p className="text-orion-muted text-sm">{ingestResult.tasks_created} tasks created across {ingestResult.phases} phases</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-orion-darker rounded-xl p-4 text-center">
                    <p className="text-orion-text font-bold text-2xl">{ingestResult.tasks_created}</p>
                    <p className="text-orion-muted text-xs mt-1">Tasks Created</p>
                  </div>
                  <div className="bg-orion-darker rounded-xl p-4 text-center">
                    <p className="text-orion-text font-bold text-2xl">{ingestResult.phases}</p>
                    <p className="text-orion-muted text-xs mt-1">Phases</p>
                  </div>
                  <div className="bg-orion-darker rounded-xl p-4 text-center">
                    <p className="text-orion-text font-bold text-2xl">16</p>
                    <p className="text-orion-muted text-xs mt-1">Agents</p>
                  </div>
                </div>

                <p className="text-orion-muted text-sm bg-orion-darker rounded-lg p-3">
                  All tasks are in the Kanban board waiting to be executed. Press the button below to start all agents sequentially. You can watch progress live in the Kanban.
                </p>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => router.push(`/kanban?project=${projectId}`)}>
                    View in Kanban first
                  </Button>
                  <Button variant="primary" onClick={handleExecute} className="flex-1 py-3">
                    <Play className="w-4 h-4" />
                    Start All Agents
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Executing */}
          {(step === 'executing' || step === 'done') && (
            <motion.div key="executing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-orion-card border border-orion-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-orion-text font-semibold text-lg">
                    {step === 'done' ? 'All agents complete!' : 'Agents are working...'}
                  </h2>
                  {step === 'executing' && <Loader2 className="w-5 h-5 text-orion-accent animate-spin" />}
                  {step === 'done' && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>

                {/* Phase indicators */}
                <div className="flex gap-1">
                  {PHASES.map(p => (
                    <div key={p.phase} className={`flex-1 h-1.5 rounded-full transition-all ${
                      currentPhase > p.phase ? 'bg-green-400' :
                      currentPhase === p.phase ? 'bg-orion-accent animate-pulse' :
                      'bg-orion-border'
                    }`} />
                  ))}
                </div>

                {/* Live log */}
                <div className="bg-orion-darker rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
                  {execLog.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`${line.startsWith('Phase') ? 'text-orion-accent font-semibold' : line.startsWith('  Done') ? 'text-green-400' : line.startsWith('  Error') ? 'text-orion-danger' : 'text-orion-muted'}`}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>

                {step === 'done' && (
                  <div className="flex gap-3 pt-2">
                    <Button variant="primary" onClick={() => router.push(`/kanban?project=${projectId}`)} className="flex-1">
                      View Full Results in Kanban
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}
