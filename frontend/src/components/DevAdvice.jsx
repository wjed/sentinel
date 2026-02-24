/**
 * In-page implementation notes for the team: DynamoDB, Lambda, APIs, etc.
 * Renders a compact panel so devs know how to build out each section.
 */
export default function DevAdvice({ title = 'How to build this', items = [], children }) {
  return (
    <div className="dev-advice">
      <div className="dev-advice-header">{title}</div>
      <div className="dev-advice-body">
        {children || (
          <ul className="dev-advice-list">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
