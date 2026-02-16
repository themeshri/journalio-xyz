# Design Rules — No Slop

When building UI for this project, follow these rules strictly. The goal is to produce distinctive, intentional design — not generic AI-generated aesthetic.

## Layout & Structure

- Don't use card grids as the default layout for everything
- Don't center everything on the page with max-w-md
- Don't add excessive padding and rounded corners everywhere
- Don't use the same border-radius on every element
- Don't default to a sidebar + main content layout unless explicitly requested

## Colors & Styling

- Don't use gradient backgrounds (especially purple-to-blue)
- Don't use indigo/violet as the primary color
- Don't use soft pastel backgrounds (gray-50, slate-100) as defaults
- Don't add drop shadows on every card or container
- Don't use opacity/blur glassmorphism effects everywhere
- Don't use the blue-to-purple gradient text trick
- Don't default to Tailwind's default color palette without intention

## Icons & Visual Elements

- Don't use Lucide/Heroicons as decorative filler
- Don't put an icon next to every heading or label
- Don't use emoji as section markers
- Don't add decorative SVG blobs or circles in the background
- Don't use generic hero illustrations or abstract art placeholders

## Typography

- Don't make every heading bold + extra-large
- Don't default to Inter or system sans-serif without consideration
- Don't use ALL CAPS for badges/labels everywhere
- Don't add a subtitle under every heading
- Don't use font-semibold on everything

## Components & Patterns

- Don't use pill-shaped badges/tags on everything
- Don't add hover animations or transitions on every interactive element
- Don't use skeleton loaders unless there's a real loading state
- Don't default to a dark mode toggle
- Don't add a search bar at the top of every page
- Don't use progress rings/circular charts as dashboard filler
- Don't wrap everything in a Card component (shadcn or otherwise)
- Don't use "Get Started" as the default CTA text
- Don't add a footer with 4 columns of links on a simple app

## Spacing & Composition

- Don't add equal spacing between all elements — use visual hierarchy
- Don't make every section symmetrical
- Don't use 3-column feature grids as the default information layout
- Don't center-align body text
- Don't use gap-4 or gap-6 uniformly across all containers

## Copy & Content

- Don't use placeholder marketing copy ("Supercharge your workflow", "Everything you need")
- Don't add descriptions under every feature that just restate the title
- Don't write button labels that are vague ("Submit", "Continue", "Get Started")
- Don't generate fake testimonials or social proof sections unless asked

## What To Do Instead

- Use whitespace and density with intention
- Pick a specific, opinionated color palette — commit to it
- Let the content dictate the layout, not a template
- Use typography scale and weight as the primary visual hierarchy tool
- Design for the actual data and use case, not a generic dashboard
- When in doubt, keep it minimal and plain — ugly-functional beats pretty-generic
