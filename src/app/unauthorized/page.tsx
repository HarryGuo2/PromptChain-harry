export default function UnauthorizedPage() {
  return (
    <main className="container">
      <div className="card">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-slate-600 mt-2">
          This tool requires profiles.is_superadmin = TRUE or profiles.is_matrix_admin = TRUE.
        </p>
        <a className="btn mt-4 inline-block" href="/">
          Back to Login
        </a>
      </div>
    </main>
  )
}
