# SOC Training Hub (practice_game)

Интерактивный 3D-тренажёр (Next.js + react-three-fiber) с миссиями, NPC-диалогами, минииграми и системой последствий выбора.

Миссии отражают ценности:
- **Ответственность**
- **Прозрачность**
- **Скорость**

## Запуск

Требования: **Node.js 18+**.

```bash
cd practice_game
npm i
npm run dev
```

Открыть приложение: `http://localhost:3000`.

### Сборка

```bash
cd practice_game
npm run build
npm run start
```

## Управление

- **ПК**: WASD/стрелки — движение, **E** — взаимодействие с NPC.
- **Мобилка**: виртуальный джойстик — движение, кнопка **E** — взаимодействие.

## Звук

- UI/миниигры/взаимодействия: процедурные SFX через Web Audio (`src/shared/lib/gameUiSfx.ts`).
- Фоновая музыка: процедурный BGM с режимами `explore` / `mission` / `minigame` (`src/shared/lib/gameBgm.ts`).
- Кнопка **Mute**: иконка динамика в левом верхнем углу, состояние сохраняется в `localStorage` (`gameAudioMuted`).

## AI ассист (диалог/подсказки)

Игра умеет запрашивать подсказки через API-роут:
- `src/app/api/ai/assist/route.ts`

Важно: вывод AI валидируется/очищается перед показом в UI (`src/shared/lib/validateAiOutput.ts`). Если AI недоступен — основной флоу не должен ломаться.

## Структура (FSD)

Проект следует Feature-Sliced Design:

```text
src/
  app/        # Next.js App Router, глобальные стили/лейауты
  features/   # фичи: движение, диалоги, миниигры, интро и т.п.
  entities/   # сущности: quest, npc, level
  shared/     # общий UI, lib, константы, утилиты
```

## Где что лежит (быстрые ссылки)

- **Экран игры**: `src/app/game-screen/ui/GameScreen.tsx`
- **3D сцена**: `src/shared/ui/SceneCanvas.tsx`
- **NPC**: `src/entities/npc/ui/NpcActor.tsx`
- **Диалоги/выборы**: `src/features/dialogue/ui/DialoguePanel.tsx`
- **Миниигры**: `src/features/mission-minigame/ui/*`

## Примечания по UX/адаптиву

- Для коротких экранов (landscape) диалоги скроллятся внутри панели, миниигры ужимаются по высоте (`src/app/globals.css`).

