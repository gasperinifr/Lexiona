import uuid
from types import SimpleNamespace
from copy import deepcopy


class SimpleResult:
    def __init__(self, data=None):
        self.data = data


class FakeTable:
    def __init__(self, name, store):
        self.name = name
        self._store = store
        self._filters = []
        self._single = False
        self._select = None

    def select(self, *args):
        self._select = args
        return self

    def insert(self, obj):
        # prepare a pending insert and return self for chaining
        if isinstance(obj, list):
            items = [deepcopy(i) for i in obj]
        else:
            items = [deepcopy(obj)]
        for item in items:
            item.setdefault("id", str(uuid.uuid4()))
        self._pending_insert = items
        return self

    def update(self, update_data):
        # store pending update to be executed when .execute() is called
        self._pending_update = update_data
        return self

    def delete(self):
        # mark pending delete and return self
        self._pending_delete = True
        return self

    def eq(self, field, value):
        self._filters.append(("eq", field, value))
        return self

    def in_(self, field, values):
        self._filters.append(("in", field, values))
        return self

    def gte(self, field, value):
        self._filters.append(("gte", field, value))
        return self

    def lte(self, field, value):
        self._filters.append(("lte", field, value))
        return self

    def gt(self, field, value):
        self._filters.append(("gt", field, value))
        return self

    def lt(self, field, value):
        self._filters.append(("lt", field, value))
        return self

    def order(self, field, *args, **kwargs):
        # Accept optional kwargs like desc=True used by upstream code
        return self

    def limit(self, n):
        self._limit = n
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        # handle pending insert
        if hasattr(self, "_pending_insert"):
            items = self._pending_insert
            for item in items:
                self._store.setdefault(self.name, []).append(item)
            result = SimpleResult(data=items)
            del self._pending_insert
            return result

        # handle pending update
        if hasattr(self, "_pending_update"):
            items = self._apply_filters()
            for it in items:
                it.update(self._pending_update)
            result = SimpleResult(data=items)
            del self._pending_update
            return result

        # handle pending delete
        if getattr(self, "_pending_delete", False):
            items = self._apply_filters()
            remaining = [i for i in self._store.get(self.name, []) if i not in items]
            self._store[self.name] = remaining
            result = SimpleResult(data=items)
            del self._pending_delete
            return result

        items = self._apply_filters()
        if getattr(self, "_limit", None) is not None:
            items = items[: self._limit]
        if self._single:
            return SimpleResult(data=items[0] if items else None)
        return SimpleResult(data=items)

    def _apply_filters(self):
        items = deepcopy(self._store.get(self.name, []))
        for op, field, value in self._filters:
            if op == "eq":
                items = [i for i in items if i.get(field) == value]
            elif op == "in":
                items = [i for i in items if i.get(field) in value]
            elif op == "gte":
                items = [i for i in items if i.get(field) >= value]
            elif op == "lte":
                items = [i for i in items if i.get(field) <= value]
            elif op == "gt":
                items = [i for i in items if i.get(field) > value]
            elif op == "lt":
                items = [i for i in items if i.get(field) < value]
        return items


class FakeAuth:
    def __init__(self, store):
        self.store = store
        self.admin = SimpleNamespace(create_user=self._create_user)

    def _create_user(self, payload):
        user_id = str(uuid.uuid4())
        user = SimpleNamespace(id=user_id)
        # add to professores
        prof = {"id": user_id, "nome": payload.get("email", "devuser"), "onboarding_concluido": False}
        self.store.setdefault("professores", []).append(prof)
        return SimpleNamespace(user=user)

    def get_user(self, token):
        # token ignored in dev; return first professor
        profs = self.store.get("professores", [])
        if not profs:
            return SimpleNamespace(user=None)
        user = SimpleNamespace(id=profs[0]["id"], email=profs[0].get("email", "dev@local"))
        return SimpleNamespace(user=user)

    def sign_in_with_password(self, payload):
        profs = self.store.get("professores", [])
        user = None
        if profs:
            user = SimpleNamespace(id=profs[0]["id"], email=payload.get("email"))
        session = SimpleNamespace(access_token="devtoken")
        return SimpleNamespace(user=user, session=session)


class FakeClient:
    def __init__(self):
        self._store = {}
        # seed with a dev professor
        prof_id = "dev_prof"
        self._store["professores"] = [{"id": prof_id, "nome": "Dev Professor", "email": "dev@local", "onboarding_concluido": True}]
        self._store.setdefault("disciplinas", [])
        self._store.setdefault("aulas", [])
        self._store.setdefault("feriados", [])
        self._store.setdefault("jobs_geracao", [])
        self._store.setdefault("insumos_ia", [])
        self.auth = FakeAuth(self._store)

    def table(self, name):
        return FakeTable(name, self._store)


def create_fake_client():
    return FakeClient()
