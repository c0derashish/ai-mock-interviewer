import { useState } from 'react'

function MethodTag({ method }) {
  if (!method) return null
  const isRule = method === 'rule_based'
  return (
    <span
      className={`tag ${isRule ? 'tag-rule' : 'tag-llm'} cursor-help`}
      title={isRule ? 'Extracted via rule-based regex (no API)' : 'Extracted via Groq LLM'}
    >
      {isRule ? 'rule' : 'llm'}
    </span>
  )
}

function SkillTag({ name }) {
  return (
    <span className="text-xs bg-surface border border-border text-text-dim px-2 py-0.5 rounded-full font-mono">
      {name}
    </span>
  )
}

export default function ResumePreview({ data, onSave }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(data?.personal?.name || '')
  const pm = data?.parse_method || {}

  if (!data) return null

  const allSkills = [
    ...(data.skills?.languages || []),
    ...(data.skills?.frameworks || []),
    ...(data.skills?.tools || []),
    ...(data.skills?.databases || []),
  ]

  async function handleSave() {
    const updated = {
      ...data,
      personal: { ...data.personal, name: editName }
    }
    await onSave?.(updated)
    setEditing(false)
  }

  return (
    <div className="card space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {editing ? (
              <input
                className="input-base text-sm w-48"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
            ) : (
              <h3 className="text-base font-semibold text-text">
                {data.personal?.name || 'Name not detected'}
              </h3>
            )}
            <MethodTag method={pm.personal} />
          </div>
          <p className="text-xs text-text-dim font-mono">
            {data.personal?.email}
            {data.personal?.phone && ` · ${data.personal.phone}`}
          </p>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="text-xs text-accent hover:text-accent-light font-medium"
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      {/* Education */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Education</span>
          <MethodTag method={pm.education} />
        </div>
        <p className="text-sm text-text">
          {data.education?.degree} {data.education?.branch && `in ${data.education.branch}`}
        </p>
        {data.education?.college && (
          <p className="text-xs text-text-dim mt-0.5">{data.education.college}
            {data.education?.cgpa && ` · CGPA ${data.education.cgpa}`}
            {data.education?.year_of_passing && ` · ${data.education.year_of_passing}`}
          </p>
        )}
      </div>

      {/* Skills */}
      {allSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Skills</span>
            <MethodTag method={pm.skills} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allSkills.slice(0, 20).map(s => <SkillTag key={s} name={s} />)}
            {allSkills.length > 20 && (
              <span className="text-xs text-text-dim">+{allSkills.length - 20} more</span>
            )}
          </div>
        </div>
      )}

      {/* Projects */}
      {data.projects?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Projects</span>
            <MethodTag method={pm.projects} />
          </div>
          <div className="space-y-2">
            {data.projects.slice(0, 4).map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent font-mono text-xs mt-0.5">▹</span>
                <div>
                  <span className="text-sm font-medium text-text">{p.name}</span>
                  {p.tech_stack?.length > 0 && (
                    <span className="text-xs text-text-dim ml-2 font-mono">
                      ({p.tech_stack.slice(0, 3).join(', ')})
                    </span>
                  )}
                  {p.description && (
                    <p className="text-xs text-text-dim mt-0.5">{p.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experience?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Experience</span>
            <MethodTag method={pm.experience} />
          </div>
          <div className="space-y-1.5">
            {data.experience.slice(0, 3).map((e, i) => (
              <div key={i} className="text-sm">
                <span className="text-text font-medium">{e.role}</span>
                <span className="text-text-dim"> at {e.company}</span>
                {e.duration_months > 0 && (
                  <span className="text-xs text-text-dim ml-1">· {e.duration_months}mo</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence */}
      {data.confidence_score !== undefined && (
        <div className="pt-2 border-t border-border">
          <span className="text-xs text-text-dim font-mono">
            Parse confidence: {Math.round(data.confidence_score * 100)}%
            {data.cached && ' · from cache'}
          </span>
        </div>
      )}
    </div>
  )
}