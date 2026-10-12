import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import LocalityPicker from './LocalityPicker'
import type { PickedLocality } from '@/lib/localities/address'

const BEIT_HILLEL = { id: '1', cbs_code: 322, name_he: 'בית הלל', name_en: 'Bet Hillel', locality_type: 'moshav', regional_council: 'מבואות החרמון', lat: 33.2, lng: 35.6 }
const BEIT_SHEAN = { id: '2', cbs_code: 9, name_he: 'בית שאן', name_en: "Bet She'an", locality_type: 'city', regional_council: null, lat: 32.5, lng: 35.5 }

function Harness({ lang = 'en' as 'en' | 'he', onPick = jest.fn() }) {
  const [v, setV] = useState<PickedLocality | null>(null)
  return <LocalityPicker lang={lang} value={v} onChange={(l) => { setV(l); onPick(l) }} />
}

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation(async (url: string) => ({
    json: async () => ({ results: String(url).includes('xyz') ? [] : [BEIT_HILLEL, BEIT_SHEAN] }),
  })) as unknown as typeof fetch
})

describe('LocalityPicker', () => {
  it('suggests as you type, showing both names and the kind of place', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox'), 'Beit')
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('Bet Hillel — בית הלל')
    expect(options[0]).toHaveTextContent('Moshav · מבואות החרמון')
    expect(options[1]).toHaveTextContent('City')
  })

  it('picking a suggestion shows it, and Change goes back to searching', async () => {
    const onPick = jest.fn()
    render(<Harness onPick={onPick} />)
    await userEvent.type(screen.getByRole('combobox'), 'Beit')
    await userEvent.click(await screen.findByRole('option', { name: /Bet Hillel/ }))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name_he: 'בית הלל', lat: 33.2 }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('works from the keyboard: arrows move, Enter picks', async () => {
    const onPick = jest.fn()
    render(<Harness onPick={onPick} />)
    await userEvent.type(screen.getByRole('combobox'), 'Beit')
    await screen.findAllByRole('option')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }))
  })

  it('says when nothing matches', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox'), 'xyz')
    expect(await screen.findByText(/No match/)).toBeInTheDocument()
  })

  it('degrades to a message when the search is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox'), 'Beit')
    await waitFor(() => expect(screen.getByText(/unavailable/i)).toBeInTheDocument())
  })

  it('speaks Hebrew when asked to', async () => {
    render(<Harness lang="he" />)
    await userEvent.type(screen.getByRole('combobox'), 'בית')
    const options = await screen.findAllByRole('option')
    expect(options[0]).toHaveTextContent('מושב')
  })
})
