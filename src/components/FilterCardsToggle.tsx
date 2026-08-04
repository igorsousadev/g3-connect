type FilterCardsToggleProps = {
  visible: boolean
  onToggle: () => void
}

export function FilterCardsToggle({ visible, onToggle }: FilterCardsToggleProps) {
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={onToggle}
      aria-expanded={visible}
    >
      {visible ? 'Ocultar filtros' : 'Exibir filtros'}
    </button>
  )
}
