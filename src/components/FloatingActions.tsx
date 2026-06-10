import { Plus, DollarSign } from 'lucide-react'

interface Props {
  onVenta: () => void
  onAbono: () => void
}

export default function FloatingActions({ onVenta, onAbono }: Props) {
  return (
    <>
      <button
        className="fab fab-left"
        style={{ background: 'var(--rosa-metalico)', color: 'white' }}
        onClick={onVenta}
        aria-label="Registrar Venta"
      >
        <Plus />
      </button>
      <button
        className="fab fab-right"
        style={{ background: 'var(--rosa-vino)', color: 'white' }}
        onClick={onAbono}
        aria-label="Registrar Abono"
      >
        <DollarSign />
      </button>
    </>
  )
}
