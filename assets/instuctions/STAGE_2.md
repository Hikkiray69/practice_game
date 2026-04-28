# STAGE 2 — Проектирование FSD-архитектуры

## 2.1 Цель этапа

Зафиксировать архитектурную основу проекта под `MVP-1` (1 миссия) так, чтобы без рефакторинга масштабироваться к `MVP-2`.

## 2.2 Структура проекта (FSD)

```text
src/
  app/
    providers/
    styles/
    router/
  processes/
    game-session/
  pages/
    main-menu/
    game/
    mission-result/
    profile/
  features/
    movement/
    dialogue/
    quest-system/
    scoring-progress/
    timer-challenge/
  entities/
    player/
    npc/
    quest/
    value/
    progress/
  shared/
    ui/
    lib/
    api/
    config/
    constants/
    types/
```

## 2.3 Границы слоев и импортов

- `app` собирает приложение и подключает провайдеры, но не хранит доменную логику.
- `pages` композируют фичи и сущности под конкретные экраны.
- `features` реализуют пользовательские сценарии; не импортируют внутренности других фич напрямую.
- `entities` содержат доменную модель и базовые операции над ней.
- `shared` содержит переиспользуемые утилиты и UI без предметной логики.

Правила импортов:
- разрешены импорты только через `index.ts` публичного API слайса;
- запрещены deep-imports вида `features/x/model/internal/*`;
- если одной фиче нужен функционал другой фичи — выносить общее в `entities` или `shared/lib`.

## 2.4 Сущности (`entities`)

### `player`
- состояние игрока: `id`, `name`, `level`, `stats`.
- связка с прогрессом и текущей миссией.

### `npc`
- данные NPC: `id`, `name`, `role`, `dialogueProfile`.
- источник стартовых реплик и контекста миссии.

### `quest`
- данные миссии: `id`, `valueTag`, `title`, `steps`, `choices`, `outcomes`.
- статусы: `new | inProgress | completed | failed`.

### `value`
- справочник ценностей/принципов компании.
- метаданные для UI и аналитики прогресса.

### `progress`
- очки, достижения, история решений по миссиям.
- агрегированное состояние прохождения.

## 2.5 Фичи (`features`)

### `movement`
- перемещение игрока в сцене и базовые ограничения движения.

### `dialogue`
- показ реплик NPC, варианты ответов, выбор игрока.

### `quest-system`
- запуск/завершение миссии, переходы шагов, фиксация исходов.

### `scoring-progress`
- подсчет очков и обновление прогресса.

### `timer-challenge`
- инфраструктура таймеров (в `MVP-1` может быть отключена флагом).

## 2.6 Контракты данных (MVP-1)

Формат миссии (TS):

```ts
export type QuestStatus = "new" | "inProgress" | "completed" | "failed";

export interface QuestChoice {
  id: string;
  label: string;
  consequenceId: string;
}

export interface QuestConsequence {
  id: string;
  scoreDelta: number;
  qualityDelta: number;
  speedDelta: number;
  summary: string;
}

export interface QuestScenario {
  id: string;
  valueTag: "responsibility" | "transparency" | "speed";
  title: string;
  intro: string;
  choices: QuestChoice[];
  consequences: QuestConsequence[];
}
```

Формат диалога (TS):

```ts
export interface DialogueOption {
  id: string;
  text: string;
  nextNodeId?: string;
  action?: "selectChoice" | "askHint" | "close";
}

export interface DialogueNode {
  id: string;
  npcId: string;
  text: string;
  options: DialogueOption[];
}
```

## 2.7 Что фиксируем для MVP-2 заранее

- миссии 2/3 будут добавляться как новые `QuestScenario` без изменения базового контракта;
- `timer-challenge` расширяется из feature-скелета в полноценную механику на этапе `MVP-2`;
- AI-вариативность диалогов не должна ломать структуру `DialogueNode`.

## 2.8 Результат этапа

Архитектурный каркас согласован:
- структура папок утверждена;
- границы слоев определены;
- сущности и фичи определены;
- контракты данных под `MVP-1` зафиксированы.

## 2.9 Статус внедрения (факт)

- этап реализован в рабочем проекте `game/`;
- `Next.js` используется в режиме `App Router`, поэтому экранный слой размещен в `src/app/*`;
- FSD-слои `features/entities/shared/processes` реализованы как кодовые директории;
- использование каталога `src/pages/*` как runtime-слоя не применяется, чтобы не конфликтовать с маршрутизацией Next;
- сборка и линт успешно проходят.

