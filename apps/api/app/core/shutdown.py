"""Server to‘xtayotganini uzoq yashovchi so‘rovlarga (SSE) bildirish.

uvicorn (va gunicorn UvicornWorker) to‘xtashda ochiq ulanishlar yopilishini kutadi — SSE oqimi
o‘zi tugamasa, `--reload` va deploy (graceful-timeout) qotib turadi. uvicorn'da bunga hook yo‘q,
shuning uchun signal ushlagichi o‘raladi (sse-starlette ham shunday qiladi). Ikki holat:
- gunicorn: ilova Server.serve()'dan OLDIN import qilinadi → `Server.handle_exit` o‘ralgani yetadi
- `uvicorn` CLI: handler ilova import qilinishidan oldin bog‘lanadi → joriy SIGINT/SIGTERM ushlagichi o‘raladi
"""

import signal
import threading

stopping = threading.Event()


def _wrap(handler):
    def wrapped(sig, frame):
        stopping.set()
        handler(sig, frame)

    wrapped._nm_wrapped = True  # type: ignore[attr-defined]
    return wrapped


try:
    from uvicorn.server import Server

    if not getattr(Server.handle_exit, "_nm_wrapped", False):
        _original_handle_exit = Server.handle_exit

        def _handle_exit(self, sig, frame):
            stopping.set()
            _original_handle_exit(self, sig, frame)

        _handle_exit._nm_wrapped = True  # type: ignore[attr-defined]
        Server.handle_exit = _handle_exit  # type: ignore[method-assign]
except ImportError:
    pass

if threading.current_thread() is threading.main_thread():
    for _sig in (signal.SIGINT, signal.SIGTERM):
        _current = signal.getsignal(_sig)
        if callable(_current) and not getattr(_current, "_nm_wrapped", False):
            signal.signal(_sig, _wrap(_current))
