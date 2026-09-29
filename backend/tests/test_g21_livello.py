"""Pins of the migration level make g21 compares with the Mini.

g21 (scripts/audit/g21.py) asks the Mini for the markers of the level that
inventario.livello_richiesto() computes: the last migration whose columns or
tables the product code names. The level is computed from what is read, so a
file or a directory skipped in silence LOWERS it, and g21 checks the Mini
against an older migration: green on a Mini below the level the code requires,
which is the deploy that "migration first, code after" must stop. Measured on a
tree copy on 2026-09-29, before the fix: v06 unreadable, level v05, exit 0 and
no message.

The pins run on a synthetic tree in tmp_path, never on the repo: three
migrations, product code that names a column of the second and, in a
subdirectory, a table of the third. Both directions:
  - intact tree: the level is the third migration. A reading that always
    raised would be a gate always closed;
  - an unreadable migration, an unreadable product file, a product file that is
    not UTF-8, an unlistable product directory: LivelloNonCalcolabile, never a
    lower level.

Each restrictive pin first asserts that its fixture bites -- the file really
cannot be opened, the directory really cannot be listed. chmod does not bite
under root, and a pin on a void fixture would be green for nothing.

Rows in scripts/audit/mutazioni.py: the strict read turned back to a silent ""
must turn the three file pins red; the walk without onerror must turn the
directory pin red. Each mutation leaves the other side strict, so each row
isolates one path.

This file lives in backend/tests and not next to scripts/audit/inventario.py:
the mutation bench runs pytest and vitest only. It loads the script by path, as
test_v07_schema.py loads apply_v07_push.py.
"""
from __future__ import annotations

import importlib.util
import os
import stat
from collections.abc import Generator
from pathlib import Path

import pytest

_AUDIT = Path(__file__).resolve().parents[2] / "scripts" / "audit"
_SPEC = importlib.util.spec_from_file_location("inventario", _AUDIT / "inventario.py")
_INV = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_INV)

_MIGRATIONS = {
    "v01_base.sql": "CREATE TABLE IF NOT EXISTS base (\n  id INT PRIMARY KEY\n) ENGINE=InnoDB;\n",
    "v02_colonna.sql": "ALTER TABLE base ADD COLUMN colonna_v02 INT NULL;\n",
    "v03_tabella.sql": (
        "CREATE TABLE IF NOT EXISTS tabella_v03 (\n  id INT PRIMARY KEY\n) ENGINE=InnoDB;\n"
    ),
}
_TOP_LEVEL_CODE = 'COLONNA = "colonna_v02"\n'
_ROUTER_CODE = 'TABELLA = "tabella_v03"\n'
_LEVEL = "v03_tabella.sql"


class _Tree:
    """The synthetic tree, with the permissions it took away, restored at teardown."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self._modes: list[tuple[Path, int]] = []

    def take_read_away(self, rel: str) -> Path:
        path = self.root / rel
        self._modes.append((path, stat.S_IMODE(path.stat().st_mode)))
        path.chmod(0)
        return path

    def restore(self) -> None:
        for path, mode in reversed(self._modes):
            path.chmod(mode)


@pytest.fixture
def tree(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[_Tree, None, None]:
    migrations = tmp_path / "backend" / "db" / "migrations"
    migrations.mkdir(parents=True)
    for name, text in _MIGRATIONS.items():
        (migrations / name).write_text(text, encoding="utf-8")
    product = tmp_path / "backend" / "pharmatimer_api"
    (product / "routers").mkdir(parents=True)
    (product / "app.py").write_text(_TOP_LEVEL_CODE, encoding="utf-8")
    (product / "routers" / "push.py").write_text(_ROUTER_CODE, encoding="utf-8")
    # livello_richiesto() reads relative paths, as g21 after its chdir.
    monkeypatch.chdir(tmp_path)
    synthetic = _Tree(tmp_path)
    yield synthetic
    synthetic.restore()


def _level_or_error():
    try:
        return _INV.livello_richiesto()
    except _INV.LivelloNonCalcolabile as exc:
        return exc


def _assert_not_computable(result) -> None:
    assert isinstance(result, _INV.LivelloNonCalcolabile), (
        f"level {result!r} computed from a tree the calculation could not read in full"
    )


def _assert_file_unreadable(path: Path) -> None:
    try:
        path.open("rb").close()
    except PermissionError:
        return
    pytest.fail(f"void fixture: {path} still opens after chmod 0 (running as root?)")


def _assert_dir_unlistable(path: Path) -> None:
    try:
        os.listdir(path)
    except PermissionError:
        return
    pytest.fail(f"void fixture: {path} still lists after chmod 0 (running as root?)")


def test_intact_tree_gives_the_last_cited_level(tree: _Tree) -> None:
    assert _level_or_error() == _LEVEL


def test_unreadable_migration_never_lowers_the_level(tree: _Tree) -> None:
    path = tree.take_read_away("backend/db/migrations/v03_tabella.sql")
    _assert_file_unreadable(path)
    _assert_not_computable(_level_or_error())


def test_unreadable_product_file_never_lowers_the_level(tree: _Tree) -> None:
    path = tree.take_read_away("backend/pharmatimer_api/routers/push.py")
    _assert_file_unreadable(path)
    _assert_not_computable(_level_or_error())


def test_non_utf8_product_file_never_lowers_the_level(tree: _Tree) -> None:
    path = tree.root / "backend" / "pharmatimer_api" / "routers" / "push.py"
    path.write_bytes(_ROUTER_CODE.encode("utf-8") + b"# \xff\n")
    _assert_not_computable(_level_or_error())


def test_unlistable_product_dir_never_lowers_the_level(tree: _Tree) -> None:
    path = tree.take_read_away("backend/pharmatimer_api/routers")
    _assert_dir_unlistable(path)
    _assert_not_computable(_level_or_error())
