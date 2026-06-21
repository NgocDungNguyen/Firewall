import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            "AIzaSyApV764YRj_FhUKQWbHLOt1-49z7Cb-nb0",
  authDomain:        "firewall-11ac4.firebaseapp.com",
  databaseURL:       "https://firewall-11ac4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "firewall-11ac4",
  storageBucket:     "firewall-11ac4.firebasestorage.app",
  messagingSenderId: "971613283860",
  appId:             "1:971613283860:web:73bfb7da79435cb91c6901",
  measurementId:     "G-6KNTG5MJBT",
}

let _app = null
export function getApp() {
  if (!_app) {
    _app = initializeApp(firebaseConfig)
    try { getAnalytics(_app) } catch (_) {}
  }
  return _app
}
