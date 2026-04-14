import React from "react"


const LinkList = (props) => {

  const linklist = (props.links || []).map((link, index) =>
    <a
      key={index}
      href={link.url}
      target="_blank"
      rel="noreferrer"
      title={link.url}
      className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-50"
    >
      {link.name}
    </a>
  )

  return (
    <div className="max-w-full space-y-2">
      {linklist}
    </div>

  )
}

export { LinkList }
