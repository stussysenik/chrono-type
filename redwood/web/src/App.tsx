import type { ReactNode } from 'react'

import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'

import { PhoenixProvider } from 'src/lib/phoenix/context'
import FatalErrorPage from 'src/pages/FatalErrorPage'

import './index.css'

interface AppProps {
  children?: ReactNode
}

/**
 * App root — RW 8.9 children-prop pattern.
 *
 * RedwoodApolloProvider removed: ChronoType uses Phoenix Channels + REST,
 * not GraphQL. PhoenixProvider supplies socket connection context to the tree.
 */
const App = ({ children }: AppProps) => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <PhoenixProvider>{children}</PhoenixProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
