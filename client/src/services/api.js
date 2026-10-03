//Adds the /api prefix, JSON headers, and the Authorization header
let onUnauthorized = null

export function setUnauthorizedHandler(fn) {
    onUnauthorized = fn
}

export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}`}),
        ...options.headers,
    };

    
    const res = await fetch('/api' + path, {...options, headers})

    if(res.status === 401 && token && onUnauthorized) {
        onUnauthorized()
    }

    let data = null
    if (res.status !== 204) {
        try {
            data = await res.json()
        } catch {
            data = null
        }
    }

    return { ok: res.ok, status: res.status, data }

}