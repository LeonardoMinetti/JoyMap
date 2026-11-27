// Trilha de navegação: os níveis lado a lado; o último é onde a pessoa está.
import React from 'react'

export default function Crumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Você está em">
      <ol>{items.map(([label, go], i) => (
        <li key={label + i}>{go && i < items.length - 1 ? <button type="button" onClick={go}>{label}</button> : <span aria-current="page">{label}</span>}</li>))}</ol>
    </nav>
  )
}
