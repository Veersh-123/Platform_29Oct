import React, { useState } from 'react'

function Node({ node, level = 0 }) {
  const [open, setOpen] = useState(level < 1)
  const pad = { paddingLeft: `${level * 14}px` }
  return (
    <div>
      <div className="flex items-center gap-2 py-1" style={pad}>
        {node.type === 'folder' ? (
          <button onClick={() => setOpen(!open)} className="w-5 text-gray-500">{open ? '▾' : '▸'}</button>
        ) : <span className="w-5" />}
        <div className="text-sm text-gray-800">{node.name}</div>
      </div>
      {open && node.children && (
        <div>
          {node.children.map((c, i) => <Node key={i} node={c} level={level+1} />)}
        </div>
      )}
    </div>
  )
}

export default function TreeView({ data }) {
  if (!data) return <div className="p-4 text-gray-400">Loading project structure...</div>
  return (
    <div className="bg-transparent rounded p-2">
      <div className="text-sm text-gray-400 mb-3">{data.root}</div>
      <div className="space-y-2">
        {data.tree.map((n, i) => (
          <div key={i} className="p-3 bg-[#071826] rounded-md">
            <div className="flex items-center gap-3">
              <div className="text-gray-400">▸</div>
              <div className="file-path">{pathJoin(n.path || n.name)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function pathJoin(p){
  if(!p) return ''
  return p.replace(/\\/g, '\\\\')
}
