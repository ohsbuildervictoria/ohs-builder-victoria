import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './ui.jsx'

describe('PageHeader', () => {
  it('renders the title and subtitle', () => {
    render(<PageHeader title="Site Diary" subtitle="Daily records" />)
    expect(screen.getByRole('heading', { name: 'Site Diary' })).toBeInTheDocument()
    expect(screen.getByText('Daily records')).toBeInTheDocument()
  })

  it('omits the subtitle when not provided', () => {
    render(<PageHeader title="Incidents" />)
    expect(screen.getByRole('heading', { name: 'Incidents' })).toBeInTheDocument()
    expect(screen.queryByText('Daily records')).not.toBeInTheDocument()
  })
})
