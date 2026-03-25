import { Navigate, Route, Routes } from "react-router-dom"
import Landing from "./features/Landing"
import DashBoard from "./features/DashBoard"
import Work from "./features/Work"
import Passport from "./features/Passport"
import Interview from "./features/Interview"
import Job from "./features/Job"
import History from "./features/History"

function App() {

  return (
    <>
         <Routes>
            <Route path="/" element={<Landing/>}/>
            <Route path="/dashboard" element={<DashBoard/>}>
              <Route index element={<Navigate to="work" replace />} />
              <Route path="work" element={<Work/>}/>
              <Route path="interview" element={<Interview/>}/>
              <Route path="passport" element={<Passport/>}/>
              <Route path="job" element={<Job/>}/>
              <Route path="history" element={<History/>}/>
            </Route>

          </Routes>
    </>
  )
}

export default App
