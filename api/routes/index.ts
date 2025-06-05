/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// Types for structured API response
interface Link {
  url: string
  text: string
  type: 'primary' | 'secondary' | 'github' | 'discord' | 'other'
}

interface Item {
  name: string
  description: string
  links: Link[]
  isStarred: boolean
  isIndex: boolean
  isCrossReference: boolean
  rawContent: string
}

interface Section {
  title: string
  level: number
  items: Item[]
  subsections: Section[]
}

interface ParsedDocument {
  filename: string
  title: string
  sections: Section[]
  metadata: {
    totalItems: number
    starredItems: number
    indexItems: number
    crossReferences: number
  }
}

interface ApiResponse {
  success: boolean
  data?: {
    documents: ParsedDocument[]
    metadata: {
      totalDocuments: number
      totalItems: number
      totalStarredItems: number
      lastUpdated: string
      version: string
    }
  }
  error?: {
    message: string
    code: string
    details?: any
  }
}

const files = (
  [
    'adblockvpnguide.md',
    'ai.md',
    'android-iosguide.md',
    'audiopiracyguide.md',
    'beginners-guide.md',
    'devtools.md',
    'downloadpiracyguide.md',
    'edupiracyguide.md',
    'file-tools.md',
    'gaming-tools.md',
    'gamingpiracyguide.md',
    'img-tools.md',
    'internet-tools.md',
    'linuxguide.md',
    'miscguide.md',
    'non-english.md',
    'readingpiracyguide.md',
    'social-media-tools.md',
    'storage.md',
    'system-tools.md',
    'text-tools.md',
    'torrentpiracyguide.md',
    'unsafesites.md',
    'video-tools.md',
    'videopiracyguide.md'
  ] as const
).map((file) => ({
  name: file,
  url: `https://raw.githubusercontent.com/fmhy/edit/main/docs/${file}`
}))

// Utility functions for parsing markdown content
function extractLinks(text: string): Link[] {
  const links: Link[] = []

  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(text)) !== null) {
    const [, linkText, url] = match
    const type = determineLinkType(url, linkText)
    links.push({ url: url.trim(), text: linkText.trim(), type })
  }

  return links
}

function determineLinkType(url: string, text: string): Link['type'] {
  if (url.includes('github.com')) return 'github'
  if (url.includes('discord.com') || url.includes('discord.gg')) return 'discord'
  if (text.toLowerCase().includes('github')) return 'github'
  if (text.toLowerCase().includes('discord')) return 'discord'
  return 'other'
}

function parseItem(line: string): Item | null {
  // Skip empty lines and lines that are just separators
  if (!line.trim() || line.trim() === '***' || line.trim().startsWith('**[◄◄')) {
    return null
  }

  // Check for special markers
  const isStarred = line.includes('⭐')
  const isIndex = line.includes('🌐')
  const isCrossReference = line.includes('↪️')

  // Extract the main content (remove list markers and special symbols)
  let content = line.replace(/^[\s*-]+/, '').trim()
  content = content.replace(/^[⭐🌐↪️]\s*/, '').trim()

  // Split by ' - ' to separate name and description
  const parts = content.split(' - ')
  let name = ''
  let description = ''

  if (parts.length >= 2) {
    name = parts[0].trim()
    description = parts.slice(1).join(' - ').trim()
  } else {
    // If no description separator, treat the whole thing as name
    name = content
  }

  // Extract name from markdown link if it's a link
  const linkMatch = name.match(/\*\*\[([^\]]+)\]/)
  if (linkMatch) {
    name = linkMatch[1]
  } else {
    // Remove markdown formatting from name
    name = name.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  }

  // Extract all links from the content
  const links = extractLinks(content)

  return {
    name: name.trim(),
    description: description.trim(),
    links,
    isStarred,
    isIndex,
    isCrossReference,
    rawContent: line.trim()
  }
}

function parseMarkdownDocument(content: string, filename: string): ParsedDocument {
  const lines = content.split('\n')
  const sections: Section[] = []
  let currentSection: Section | null = null
  let currentSubsection: Section | null = null

  // Extract title from filename
  const title = filename.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip empty lines and navigation links
    if (!trimmedLine || trimmedLine === '***' || trimmedLine.startsWith('**[◄◄')) {
      continue
    }

    // Check for main sections (# ►)
    if (trimmedLine.startsWith('# ►')) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: trimmedLine.replace('# ►', '').trim(),
        level: 1,
        items: [],
        subsections: []
      }
      currentSubsection = null
      continue
    }

    // Check for subsections (## ▷)
    if (trimmedLine.startsWith('## ▷')) {
      if (currentSection) {
        if (currentSubsection) {
          currentSection.subsections.push(currentSubsection)
        }
        currentSubsection = {
          title: trimmedLine.replace('## ▷', '').trim(),
          level: 2,
          items: [],
          subsections: []
        }
      }
      continue
    }

    // Check for items (lines starting with * or -)
    if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
      const item = parseItem(trimmedLine)
      if (item) {
        if (currentSubsection) {
          currentSubsection.items.push(item)
        } else if (currentSection) {
          currentSection.items.push(item)
        }
      }
    }
  }

  // Add the last section
  if (currentSection) {
    if (currentSubsection) {
      currentSection.subsections.push(currentSubsection)
    }
    sections.push(currentSection)
  }

  // Calculate metadata
  let totalItems = 0
  let starredItems = 0
  let indexItems = 0
  let crossReferences = 0

  const countItems = (section: Section) => {
    section.items.forEach(item => {
      totalItems++
      if (item.isStarred) starredItems++
      if (item.isIndex) indexItems++
      if (item.isCrossReference) crossReferences++
    })
    section.subsections.forEach(countItems)
  }

  sections.forEach(countItems)

  return {
    filename,
    title,
    sections,
    metadata: {
      totalItems,
      starredItems,
      indexItems,
      crossReferences
    }
  }
}

export default defineCachedEventHandler(
  async (event): Promise<ApiResponse> => {
    try {
      // Fetch all markdown files
      const fetchPromises = files.map(async (file) => {
        try {
          const content = await $fetch<string>(file.url)
          return { content, filename: file.name }
        } catch (error) {
          console.error(`Failed to fetch ${file.name}:`, error)
          throw new Error(`Failed to fetch ${file.name}`)
        }
      })

      const fetchedFiles = await Promise.all(fetchPromises)

      // Parse each document
      const documents: ParsedDocument[] = []
      let totalItems = 0
      let totalStarredItems = 0

      for (const { content, filename } of fetchedFiles) {
        try {
          const parsedDoc = parseMarkdownDocument(content, filename)
          documents.push(parsedDoc)
          totalItems += parsedDoc.metadata.totalItems
          totalStarredItems += parsedDoc.metadata.starredItems
        } catch (error) {
          console.error(`Failed to parse ${filename}:`, error)
          // Continue with other files instead of failing completely
        }
      }

      // Set response headers
      appendResponseHeaders(event, {
        'content-type': 'application/json;charset=utf-8',
        'cache-control': 'public, max-age=7200'
      })

      // Return structured JSON response
      return {
        success: true,
        data: {
          documents,
          metadata: {
            totalDocuments: documents.length,
            totalItems,
            totalStarredItems,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
          }
        }
      }
    } catch (error) {
      console.error('API Error:', error)

      // Set error response headers
      setResponseStatus(event, 500)
      appendResponseHeaders(event, {
        'content-type': 'application/json;charset=utf-8'
      })

      return {
        success: false,
        error: {
          message: 'Internal server error while processing documents',
          code: 'PROCESSING_ERROR',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      }
    }
  },
  {
    maxAge: 60 * 60,
    name: 'single-page-json',
    getKey: () => 'default'
  }
)
