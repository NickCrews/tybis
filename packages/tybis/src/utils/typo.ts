export function suggestColumnName(input: string, candidates: string[]): string | undefined {
    if (candidates.length === 0) return undefined

    const normalizedInput = normalizeColumnName(input)
    if (normalizedInput.length === 0) return undefined

    let best: { name: string; distance: number; length: number } | undefined

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeColumnName(candidate)
        if (normalizedCandidate.length === 0) continue

        const distance = levenshteinDistance(normalizedInput, normalizedCandidate)
        const lengthDelta = Math.abs(normalizedInput.length - normalizedCandidate.length)
        const adjustedDistance = distance + Math.floor(lengthDelta / 2)

        if (
            !best ||
            adjustedDistance < best.distance ||
            (adjustedDistance === best.distance && candidate.length < best.length) ||
            (adjustedDistance === best.distance && candidate.length === best.length && candidate < best.name)
        ) {
            best = { name: candidate, distance: adjustedDistance, length: candidate.length }
        }
    }

    if (!best) return undefined

    const threshold = Math.max(1, Math.floor(normalizedInput.length * 0.4))
    return best.distance <= threshold ? best.name : undefined
}

function normalizeColumnName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length

    const prev = new Uint16Array(b.length + 1)
    const curr = new Uint16Array(b.length + 1)

    for (let j = 0; j <= b.length; j++) {
        prev[j] = j
    }

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            const deletion = prev[j]! + 1
            const insertion = curr[j - 1]! + 1
            const substitution = prev[j - 1]! + cost
            curr[j] = Math.min(deletion, insertion, substitution)
        }
        for (let j = 0; j <= b.length; j++) {
            prev[j] = curr[j]!
        }
    }

    return prev[b.length]!
}
