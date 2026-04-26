import React from "react"

function getSafeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

const LinkList = (props) => {

  const linklist = (props.links || []).map((link, index) => {
    const safeUrl = getSafeUrl(link.url);
    return safeUrl ? (
      <a
        key={index}
        href={safeUrl}
        target="_blank"
        rel="noreferrer"
        title={safeUrl}
        className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-50"
      >
        {link.name}
      </a>
    ) : (
      <span
        key={index}
        title="Invalid URL"
        className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-400 cursor-not-allowed"
      >
        {link.name}
      </span>
    );
  })

  return (
    <div className="max-w-full space-y-2">
      {linklist}
    </div>

  )
}

export { LinkList }
