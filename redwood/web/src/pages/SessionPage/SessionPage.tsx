// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const SessionPage = () => {
  return (
    <>
      <Metadata title="Session" description="Session page" />

      <h1>SessionPage</h1>
      <p>
        Find me in <code>./web/src/pages/SessionPage/SessionPage.tsx</code>
      </p>
      {/*
          My default route is named `session`, link to me with:
          `<Link to={routes.session()}>Session</Link>`
      */}
    </>
  )
}

export default SessionPage
