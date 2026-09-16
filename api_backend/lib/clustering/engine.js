/**
 * SamadhanSetu — Deterministic Mathematical Clustering & Emergence Engine
 * 
 * Computes exact normalized cosine similarity on 768-dim Gemini embeddings,
 * applies geographic and temporal weighting, and clusters civic signals into
 * validated community problem patterns without LLM guesswork.
 */

// 1. Exact L2-Normalized Cosine Similarity
export function computeCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0
  const len = Math.min(vecA.length, vecB.length)
  let dot = 0
  let normASq = 0
  let normBSq = 0

  for (let i = 0; i < len; i++) {
    const a = vecA[i]
    const b = vecB[i]
    dot += a * b
    normASq += a * a
    normBSq += b * b
  }

  if (normASq === 0 || normBSq === 0) return 0
  return dot / (Math.sqrt(normASq) * Math.sqrt(normBSq))
}

// 2. Hierarchical Geographic Proximity
export function computeGeographicAffinity(subA, subB) {
  const distA = (subA.district || subA.districts?.name || '').toLowerCase().trim()
  const distB = (subB.district || subB.districts?.name || '').toLowerCase().trim()
  const blockA = (subA.block || subA.blocks?.name || '').toLowerCase().trim()
  const blockB = (subB.block || subB.blocks?.name || '').toLowerCase().trim()

  // Same block and district
  if (distA && distA === distB && blockA && blockA === blockB) {
    return 1.0
  }
  // Same district, different or unspecified block
  if (distA && distA === distB) {
    return 0.85
  }

  // Known adjacent district pairings in Jharkhand
  const adjacentDistricts = {
    gumla: ['latehar', 'simdega', 'ranchi', 'khunti', 'lohardaga'],
    ranchi: ['gumla', 'khunti', 'ramgarh', 'lohardaga', 'purba singhbhum'],
    latehar: ['gumla', 'lohardaga', 'palamu', 'chatra'],
    simdega: ['gumla', 'khunti', 'pashchimi singhbhum'],
  }

  if (distA && distB && adjacentDistricts[distA]?.includes(distB)) {
    return 0.65
  }

  return 0.25 // Distant district
}

// 3. Temporal Recency Weight (30-day half-life)
export function computeRecencyWeight(createdAt) {
  if (!createdAt) return 1.0
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24))
  const lambda = Math.LN2 / 30
  return Math.exp(-lambda * ageDays)
}

// 4. Multi-Factor Composite Emergence Score (0 to 100)
export function calculateEmergenceScore(cluster) {
  const members = cluster.members || []
  const N = members.length
  if (N === 0) return 0

  // 1. Volume Factor (S_count): log-scale saturation from N=3 to N=10
  const S_count = Math.min(1.0, Math.log(1 + N) / Math.log(1 + 10))

  // 2. Severity Factor (S_severity): average severity on 1-10 scale
  const totalSeverity = members.reduce((sum, m) => sum + (m.severity_score || 5.0), 0)
  const avgSeverity = totalSeverity / N
  const S_severity = Math.min(1.0, Math.max(0.1, avgSeverity / 10.0))

  // 3. Semantic Cohesion Factor (S_cohesion): average similarity to centroid or pairwise
  const avgSimilarity = cluster.avg_similarity || 0.82
  const S_cohesion = Math.min(1.0, Math.max(0.5, avgSimilarity))

  // 4. Geographic Concentration Factor (S_geo): fraction of signals in top district
  const districtCounts = {}
  members.forEach((m) => {
    const d = (m.district || m.districts?.name || 'Jharkhand').toLowerCase()
    districtCounts[d] = (districtCounts[d] || 0) + 1
  })
  const topDistrictCount = Math.max(...Object.values(districtCounts), 1)
  const S_geo = topDistrictCount / N

  // 5. Temporal Velocity Factor (S_velocity): fraction in last 14 days
  const recentCount = members.filter((m) => {
    const ageDays = (Date.now() - new Date(m.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays <= 14
  }).length
  const S_velocity = Math.min(1.0, (recentCount / N) * 1.2)

  // Weighted composite score
  const rawScore = 100 * (
    0.25 * S_count +
    0.20 * S_severity +
    0.25 * S_cohesion +
    0.15 * S_geo +
    0.15 * S_velocity
  )

  return Math.min(100, Math.max(10, Math.round(rawScore)))
}

// 5. Compute Centroid of 768-dim Vectors
export function calculateCentroid(vectors) {
  if (!vectors || vectors.length === 0) return null
  const dim = vectors[0].length
  const centroid = new Array(dim).fill(0)

  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i]
    }
  }

  // Re-normalize centroid vector
  let normSq = 0
  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectors.length
    normSq += centroid[i] * centroid[i]
  }

  const norm = Math.sqrt(normSq)
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      centroid[i] /= norm
    }
  }

  return centroid
}

// 6. Main Agglomerative Clustering Algorithm
export function clusterSubmissions(submissions, options = {}) {
  const similarityThreshold = parseFloat(process.env.CLUSTER_SIMILARITY_THRESHOLD || options.similarityThreshold || 0.78)
  const minClusterSize = parseInt(process.env.CLUSTER_MIN_SIZE || options.minClusterSize || 3, 10)

  // Filter valid submissions with 768-dim embeddings
  const valid = []
  for (const sub of submissions) {
    let emb = null
    if (Array.isArray(sub.embedding)) {
      emb = sub.embedding
    } else if (sub.problem_embeddings?.[0]?.embedding) {
      try {
        emb = JSON.parse(sub.problem_embeddings[0].embedding)
      } catch (e) {
        emb = null
      }
    } else if (typeof sub.embedding === 'string') {
      try {
        emb = JSON.parse(sub.embedding)
      } catch (e) {
        emb = null
      }
    }

    if (emb && Array.isArray(emb) && emb.length === 768) {
      const ai = Array.isArray(sub.problem_ai_analysis)
        ? sub.problem_ai_analysis[0]
        : sub.problem_ai_analysis || {}
      const distName = sub.districts?.name || sub.district || 'Gumla'

      valid.push({
        ...sub,
        parsedEmbedding: emb,
        domain: (ai.domain || sub.primary_domain || 'OTHER').toUpperCase(),
        severity_score: parseFloat(ai.severity_score || sub.severity_score || 5.0),
        district: distName,
      })
    }
  }

  const visited = new Set()
  const clusters = []
  const candidatePairs = []
  const isolated = []

  for (let i = 0; i < valid.length; i++) {
    if (visited.has(valid[i].id)) continue

    const root = valid[i]
    const group = [root]
    const memberVectors = [root.parsedEmbedding]
    const similarities = [1.0]

    for (let j = 0; j < valid.length; j++) {
      if (i === j || visited.has(valid[j].id)) continue

      const candidate = valid[j]

      // Domain Gatekeeper: must be compatible
      if (root.domain !== 'OTHER' && candidate.domain !== 'OTHER' && root.domain !== candidate.domain) {
        continue
      }

      // Compute Semantic Similarity
      const semSim = computeCosineSimilarity(root.parsedEmbedding, candidate.parsedEmbedding)

      // Compute Geographic Proximity
      const geoAff = computeGeographicAffinity(root, candidate)

      // Composite Affinity
      const compositeScore = 0.8 * semSim + 0.2 * geoAff

      if (semSim >= similarityThreshold && geoAff >= 0.65) {
        group.push(candidate)
        memberVectors.push(candidate.parsedEmbedding)
        similarities.push(semSim)
      }
    }

    // Check if group size qualifies
    if (group.length >= minClusterSize) {
      group.forEach((m) => visited.add(m.id))

      const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length
      const avgSev = group.reduce((a, b) => a + b.severity_score, 0) / group.length
      const centroid = calculateCentroid(memberVectors)

      // Collect locations
      const locations = Array.from(new Set(group.map((m) => m.district).filter(Boolean)))
      const primaryDomain = root.domain

      // Generate Descriptive Cluster Name & Summary
      const locationLabel = locations.join(' & ') || 'Jharkhand'
      const name = `${primaryDomain.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Pattern in ${locationLabel}`
      const description = `Aggregated community reports (${group.length} verified signals) in ${locationLabel} regarding recurring ${primaryDomain.toLowerCase()} challenges. Sample issue: "${group[0].original_text || group[0].raw_text}".`

      const clusterObj = {
        name,
        description,
        primary_domain: primaryDomain,
        problem_count: group.length,
        avg_severity: Math.round(avgSev * 10) / 10,
        avg_similarity: Math.round(avgSim * 1000) / 1000,
        centroid,
        locations,
        members: group.map((m, idx) => ({
          ...m,
          similarity_score: Math.round((similarities[idx] || 0.85) * 1000) / 1000,
        })),
      }

      clusterObj.emergence_score = calculateEmergenceScore(clusterObj)
      clusters.push(clusterObj)
    } else if (group.length === 2) {
      group.forEach((m) => visited.add(m.id))
      candidatePairs.push({
        primary_domain: root.domain,
        members: group,
        similarity: Math.round(similarities[1] * 1000) / 1000,
      })
    } else {
      visited.add(root.id)
      isolated.push(root)
    }
  }

  return {
    clusters: clusters.sort((a, b) => b.emergence_score - a.emergence_score),
    candidatePairs,
    isolated,
    stats: {
      totalSubmissions: valid.length,
      clustersFormed: clusters.length,
      candidatePairsFormed: candidatePairs.length,
      isolatedCount: isolated.length,
    },
  }
}
