export default function ErrorAlert({ message }: { message: string }) {
  return (
    <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {message}
    </p>
  )
}

