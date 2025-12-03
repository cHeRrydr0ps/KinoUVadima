export function useParams(): { id?: string } {
  try {
    const path = window.location.pathname
    const segs = path.split('/').filter(Boolean)
    const id = segs[segs.length - 1]
    return { id }
  } catch {
    return {}
  }
}
