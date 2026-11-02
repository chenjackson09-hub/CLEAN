import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'

const mockList = jest.fn()
const mockAdd = jest.fn()
const mockRemove = jest.fn()
jest.mock('@/lib/actions/homePhotos', () => ({
  listMyHomePhotos: (...a: unknown[]) => mockList(...a),
  addHomePhoto: (...a: unknown[]) => mockAdd(...a),
  removeHomePhoto: (...a: unknown[]) => mockRemove(...a),
}))

const mockUpload = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    storage: { from: (bucket: string) => ({ upload: (...a: unknown[]) => mockUpload(bucket, ...a) }) },
  }),
}))
jest.mock('@/lib/image/normalizeImage', () => ({ normalizeImageToJpeg: (f: File) => Promise.resolve(f) }))

import HomePhotosManager from './HomePhotosManager'

const photo = (n: number) => ({ path: `user-1/p${n}.jpg`, url: `https://signed/p${n}` })

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue({ ok: true, photos: [] })
  mockUpload.mockResolvedValue({ error: null })
  Object.defineProperty(globalThis.crypto, 'randomUUID', { value: () => '22222222-2222-4222-8222-222222222222', configurable: true })
})

describe('HomePhotosManager', () => {
  it('says the photos are optional, recommended and private — always', async () => {
    render(<HomePhotosManager />)
    expect(await screen.findByText('Photos of your home')).toBeInTheDocument()
    expect(screen.getByText('Optional · recommended')).toBeInTheDocument()
    expect(screen.getByText(/Only a cleaner you send a request to can see these photos/)).toBeInTheDocument()
  })

  it('shows the photos the host already added', async () => {
    mockList.mockResolvedValue({ ok: true, photos: [photo(1), photo(2)] })
    render(<HomePhotosManager />)
    expect(await screen.findAllByAltText('Photo of the home')).toHaveLength(2)
    expect(screen.getByText('2 / 6')).toBeInTheDocument()
  })

  it('uploads into the host\'s own private folder, then registers the photo', async () => {
    mockAdd.mockResolvedValue({ ok: true, photos: [photo(1)] })
    const user = userEvent.setup()
    render(<HomePhotosManager />)
    await screen.findByText('Photos of your home')
    await user.upload(screen.getByTestId('home-photo-input'), new File(['x'], 'kitchen.heic', { type: 'image/heic' }))
    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    expect(mockUpload).toHaveBeenCalledWith('home-photos', 'user-1/22222222-2222-4222-8222-222222222222.jpg', expect.anything(), { contentType: 'image/jpeg' })
    expect(mockAdd).toHaveBeenCalledWith('user-1/22222222-2222-4222-8222-222222222222.jpg')
    expect(await screen.findByAltText('Photo of the home')).toBeInTheDocument()
  })

  it('shows the problem and adds nothing when the upload fails', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'too big' } })
    const user = userEvent.setup()
    render(<HomePhotosManager />)
    await screen.findByText('Photos of your home')
    await user.upload(screen.getByTestId('home-photo-input'), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not upload the photo')
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('removes a photo', async () => {
    mockList.mockResolvedValue({ ok: true, photos: [photo(1)] })
    mockRemove.mockResolvedValue({ ok: true, photos: [] })
    const user = userEvent.setup()
    render(<HomePhotosManager />)
    await user.click(await screen.findByRole('button', { name: 'Remove photo' }))
    expect(mockRemove).toHaveBeenCalledWith('user-1/p1.jpg')
    await waitFor(() => expect(screen.queryByAltText('Photo of the home')).not.toBeInTheDocument())
  })

  it('stops at six photos', async () => {
    mockList.mockResolvedValue({ ok: true, photos: [1, 2, 3, 4, 5, 6].map(photo) })
    render(<HomePhotosManager />)
    await screen.findAllByAltText('Photo of the home')
    expect(screen.getByRole('button', { name: /Add photos/ })).toBeDisabled()
  })
})
