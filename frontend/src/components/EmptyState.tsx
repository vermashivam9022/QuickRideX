export default function EmptyState({ message }: { message: string }) {
  return (
    <p className="mt-5 text-gray-600">
      {message}
    </p>
  )
}

