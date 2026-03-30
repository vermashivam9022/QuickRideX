export default function LoadingState({ label }: { label?: string }) {
  return (
    <div className="py-6 text-center text-gray-600">
      {label ?? 'Loading...'}
    </div>
  )
}

