export default function GapPlanCard({ plan }) {
  return (
    <div className="card border-l-2 border-l-danger space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text">{plan.topic}</h4>
        <span className="text-xs font-mono text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
          {plan.fix_in}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs font-mono text-text-dim mb-0.5">Missing concept</p>
          <p className="text-text">{plan.core_concept_missing}</p>
        </div>

        {plan.practice_resource && (
          <div>
            <p className="text-xs font-mono text-text-dim mb-0.5">Practice here</p>
            <p className="text-accent-light font-mono text-xs">{plan.practice_resource}</p>
          </div>
        )}

        {plan.resume_angle && (
          <div>
            <p className="text-xs font-mono text-text-dim mb-0.5">How to show it</p>
            <p className="text-text-dim text-xs">{plan.resume_angle}</p>
          </div>
        )}
      </div>
    </div>
  )
}