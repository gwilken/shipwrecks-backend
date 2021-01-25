const setSecureHeaders = (req, res, next) => {
  res.setHeader("X-Powered-By", "a_whole_lotta_coffee");
  res.setHeader("Content-Security-Policy", "default-src 'none'; manifest-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline';");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "1; mode=block")
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate")
  res.setHeader("Expires", "-1")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Feature-Policy", "microphone 'none'; camera 'none'; fullscreen 'none'; payment 'none';")
  next();
}

module.exports = { setSecureHeaders }
