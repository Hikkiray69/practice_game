"use client";

import { playGameUiSfx } from "@/shared/lib/gameUiSfx";

export function GameIntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="gameIntroRoot" lang="ru" role="document" aria-label="Экран приветствия SOC Training Hub">
      <div className="gameIntroGlow" aria-hidden />
      <div className="gameIntroGrid" aria-hidden />
      <div className="gameIntroNoise" aria-hidden />

      <div className="gameIntroShell">
        <header className="gameIntroHeader">
          <p className="gameIntroEyebrow">Интерактивный тренажёр</p>
          <h1 className="gameIntroTitle">SOC Training Hub</h1>
          <p className="gameIntroLead">
            Три миссии в 3D-офисе: диалоги, выборы и миниигры — знакомство с ценностями и принципами через опыт, а не
            через слайды.
          </p>
        </header>

        <div className="gameIntroColumns">
          <section className="gameIntroCard" aria-labelledby="gameIntro-about">
            <h2 id="gameIntro-about" className="gameIntroCardTitle">
              О чём игра
            </h2>
            <ul className="gameIntroList">
              <li>
                <span className="gameIntroDot gameIntroDot--resp" aria-hidden />
                <strong>Ответственность</strong> — срок, качество и последствия решений перед релизом.
              </li>
              <li>
                <span className="gameIntroDot gameIntroDot--trans" aria-hidden />
                <strong>Прозрачность</strong> — как говорить о рисках с командой и клиентом.
              </li>
              <li>
                <span className="gameIntroDot gameIntroDot--speed" aria-hidden />
                <strong>Скорость</strong> — темп и объём работ при жёстком дедлайне.
              </li>
              <li>После миссии — свод метрик и короткий разбор выбора; в конце кампании — итоговый профиль.</li>
            </ul>
          </section>

          <section className="gameIntroCard" aria-labelledby="gameIntro-how">
            <h2 id="gameIntro-how" className="gameIntroCardTitle">
              Как играть
            </h2>
            <ul className="gameIntroList">
              <li>
                <kbd className="gameIntroKbd">WASD</kbd>, стрелки или джойстик на телефоне — движение по хабу.
              </li>
              <li>
                Подойди к наставнику в зоне миссии и нажми <kbd className="gameIntroKbd">E</kbd>.
              </li>
              <li>Прочитай преамбулу, при желании пройди миниигру, затем выбери ветку — последствия видны сразу.</li>
              <li>Можно перепроходить миссии и кампанию, чтобы сравнить разные компромиссы.</li>
            </ul>
          </section>
        </div>

        <footer className="gameIntroFooter">
          <button
            type="button"
            className="gameIntroStart"
            onClick={() => {
              playGameUiSfx("confirm");
              onStart();
            }}
          >
            Начать
          </button>
          <p className="gameIntroFootnote">Учебный прототип · решения в игре не равны корпоративным инструкциям</p>
        </footer>
      </div>
    </div>
  );
}
