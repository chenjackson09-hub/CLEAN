import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AvatarCropModal from './AvatarCropModal'

const file = new File(['x'], 'me.png', { type: 'image/png' })

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:photo')
  URL.revokeObjectURL = jest.fn()
})

function loaded(natW: number, natH: number) {
  const img = screen.getByRole('dialog').querySelector('img') as HTMLImageElement
  Object.defineProperty(img, 'naturalWidth', { value: natW, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: natH, configurable: true })
  fireEvent.load(img)
  return img
}

describe('AvatarCropModal', () => {
  it('shows the frame, a zoom slider and the two buttons', () => {
    render(<AvatarCropModal file={file} onDone={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Frame your photo' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Zoom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use photo' })).toBeDisabled() // until the photo has loaded
  })

  it('cancel hands nothing back', () => {
    const onDone = jest.fn()
    const onCancel = jest.fn()
    render(<AvatarCropModal file={file} onDone={onDone} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('crops the visible square of the photo into a JPEG', async () => {
    const drawImage = jest.fn()
    const toBlob = jest.fn((cb: (b: Blob | null) => void) => cb(new Blob(['jpeg'], { type: 'image/jpeg' })))
    const ctx = { drawImage }
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob as never)

    const onDone = jest.fn()
    render(<AvatarCropModal file={file} onDone={onDone} onCancel={jest.fn()} />)
    loaded(2000, 1000)
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())

    // zoom 1 on a 2000x1000 photo = the middle 1000x1000 square
    const [, sx, sy, side] = drawImage.mock.calls[0]
    expect(sx).toBeCloseTo(500)
    expect(sy).toBeCloseTo(0)
    expect(side).toBeCloseTo(1000)
    const out = onDone.mock.calls[0][0] as File
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('me.jpg')
  })

  it('zooming in crops a smaller part of the photo', async () => {
    const drawImage = jest.fn()
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never)
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(((cb: (b: Blob | null) => void) => cb(new Blob(['j']))) as never)
    const onDone = jest.fn()
    render(<AvatarCropModal file={file} onDone={onDone} onCancel={jest.fn()} />)
    loaded(1000, 1000)
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(drawImage.mock.calls[0][3]).toBeCloseTo(500)
  })

  it('keeps a photo the browser cannot display exactly as picked', () => {
    const onDone = jest.fn()
    render(<AvatarCropModal file={file} onDone={onDone} onCancel={jest.fn()} />)
    fireEvent.error(screen.getByRole('dialog').querySelector('img') as HTMLImageElement)
    expect(onDone).toHaveBeenCalledWith(file)
  })
})
