// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient"; // <- единственный источник клиента

export default function App() {
  // обмен PKCE-кода из URL на сессию + чистим query
  useEffect(() => {
    const url = new URL(window.location.href);
    const hasCode = url.searchParams.get("code");
    const hasError = url.searchParams.get("error_description");
    if (hasCode || hasError) {
      supabase.auth.exchangeCodeForSession(window.location.href).finally(() => {
        const clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, clean);
      });
    }
  }, []);
  
  const [status, setStatus] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // форма заявки на сотрудничество. Используем поля из нового брифа:
  // name               – имя заявителя (обязательно)
  // phone              – контактный телефон (обязательно)
  // contact_methods    – массив выбранных способов связи
  // contact_other      – уточнение для поля "Другое" в способе связи
  // social_link        – ссылка на канал или социальную сеть
  // activity           – род деятельности / тематика блога
  // heard_about        – откуда узнали о компании (обязательно)
  // heard_about_other  – уточнение для поля "Другое" в heard_about
  // cooperation        – массив выбранных форматов сотрудничества (обязательно)
  // cooperation_other  – уточнение для поля "Другое" в cooperation
  // comments           – дополнительные комментарии/пожелания
  const [form, setForm] = useState({
    name: "",
    phone: "",
    contact_methods: [],
    contact_other: "",
    social_link: "",
    activity: "",
    heard_about: "",
    heard_about_other: "",
    cooperation: [],
    cooperation_other: "",
    comments: "",
  });

  // обязательные поля:
  // имя, телефон, хотя бы один способ связи, выбранный источник узнавания и хотя бы один формат сотрудничества
  const canSubmit = useMemo(
    () =>
      form.name &&
      form.phone &&
      form.contact_methods.length > 0 &&
      form.heard_about &&
      form.cooperation.length > 0,
    [form]
  );

  // обработка изменения обычных текстовых полей
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // переключение значений в списках чекбоксов
  function toggleCheckbox(field, value) {
    setForm((prev) => {
      const arr = prev[field];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...arr, value] };
      }
    });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("");

    if (!canSubmit) {
      setStatus("Заполните обязательные поля.");
      return;
    }
    if (honeypot) {
      setStatus("Ошибка отправки.");
      return;
    }

    // формируем объект для записи. Массива храним как массив (Supabase поддерживает тип array),
    // дополнительное поле other тоже передаём отдельно
    const payload = {
      name:              form.name,
      phone:             form.phone,
      contact_methods:   form.contact_methods,
      contact_other:     form.contact_other,
      social_link:       form.social_link,
      activity:          form.activity,
      heard_about:       form.heard_about,
      heard_about_other: form.heard_about_other,
      cooperation:       form.cooperation,
      cooperation_other: form.cooperation_other,
      comments:          form.comments,
      user_agent:        navigator.userAgent,
      utm:               window.location.search,
    };

    try {
      // записываем данные напрямую в таблицу responses. Убедитесь, что таблица содержит соответствующие колонки.
      const { data, error } = await supabase.from("responses").insert(payload).select();
      if (error) {
        console.error("Insert error:", error);
        setStatus(`Ошибка: ${error.message}`);
        return;
      }
      console.log("Insert OK:", data);
      setStatus("Готово! Спасибо за ответы.");
      setForm({
        name: "", phone: "", contact_methods: [], contact_other: "",
        social_link: "", activity: "", heard_about: "", heard_about_other: "",
        cooperation: [], cooperation_other: "", comments: "",
      });
    } catch (err) {
      console.error("Network/JS error:", err);
      setStatus(`Сбой сети/доступа: ${String(err?.message || err)}`);
    }
  };

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-10 text-[#f2e9d0] overflow-hidden"
      style={{
        backgroundImage:
          "url('/assets/steampunk-bg.webp'), radial-gradient(1200px 800px at 20% -10%, rgba(201,154,64,.16), transparent 60%), radial-gradient(1000px 600px at 120% 120%, rgba(139,107,42,.12), transparent 50%), linear-gradient(180deg, #13110f, #0b0a08 60%)",
        backgroundSize: 'cover, auto, auto, auto',
        backgroundPosition: 'center',
      }}
    >
      {/* Основной контейнер */}
      <div className="relative max-w-6xl w-full">
        
        {/* Блоки шестеренок по граням */}
        <div className="pointer-events-none absolute inset-0 z-20">
          
          {/* 1. Верхний горизонтальный блок - ближе к левому краю */}
          <div className="absolute -top-20 left-8 md:left-12 flex items-center gap-0 z-30">
            <div className="relative">
              <img src="/assets/gear-large.webp" alt="" className="w-40 md:w-48 animate-spin-slow" />
              <img src="/assets/bolt-hex.webp" alt="" className="absolute inset-0 m-auto w-10 md:w-12" />
            </div>
            <div className="relative -ml-12">
              <img src="/assets/gear-medium.webp" alt="" className="w-28 md:w-32 animate-spin-slower" />
              <img src="/assets/bolt-slotted.webp" alt="" className="absolute inset-0 m-auto w-7 md:w-8" />
            </div>
            <div className="relative -ml-10">
              <img src="/assets/gear-small.webp" alt="" className="w-20 md:w-24 animate-spin-slow" />
              <img src="/assets/bolt-rivet.webp" alt="" className="absolute inset-0 m-auto w-5 md:w-6" />
            </div>
          </div>

          {/* 2. Нижний горизонтальный блок - ближе к правому краю */}
          <div className="absolute -bottom-20 right-8 md:right-12 flex items-center gap-0 z-30">
            <div className="relative">
              <img src="/assets/gear-large.webp" alt="" className="w-40 md:w-48 animate-spin-slow" />
              <img src="/assets/bolt-hex.webp" alt="" className="absolute inset-0 m-auto w-10 md:w-12" />
            </div>
            <div className="relative -ml-12">
              <img src="/assets/gear-medium.webp" alt="" className="w-28 md:w-32 animate-spin-slower" />
              <img src="/assets/bolt-slotted.webp" alt="" className="absolute inset-0 m-auto w-7 md:w-8" />
            </div>
            <div className="relative -ml-10">
              <img src="/assets/gear-small.webp" alt="" className="w-20 md:w-24 animate-spin-slow" />
              <img src="/assets/bolt-rivet.webp" alt="" className="absolute inset-0 m-auto w-5 md:w-6" />
            </div>
          </div>

          {/* 3. Левый вертикальный блок - ближе к нижней грани, порядок: большая, средняя, маленькая */}
          <div className="absolute left-0 bottom-32 md:bottom-40 transform -translate-x-1/2 flex flex-col items-center gap-0 z-30">
            <div className="relative">
              <img src="/assets/gear-large.webp" alt="" className="w-40 md:w-48 animate-spin-slow" />
              <img src="/assets/bolt-hex.webp" alt="" className="absolute inset-0 m-auto w-10 md:w-12" />
            </div>
            <div className="relative -mt-12">
              <img src="/assets/gear-medium.webp" alt="" className="w-28 md:w-32 animate-spin-slower" />
              <img src="/assets/bolt-slotted.webp" alt="" className="absolute inset-0 m-auto w-7 md:w-8" />
            </div>
            <div className="relative -mt-10">
              <img src="/assets/gear-small.webp" alt="" className="w-20 md:w-24 animate-spin-slow" />
              <img src="/assets/bolt-rivet.webp" alt="" className="absolute inset-0 m-auto w-5 md:w-6" />
            </div>
          </div>

          {/* 4. Правый вертикальный блок - ровно на золотой рамке, ближе к верхней грани */}
          <div className="absolute right-0 top-32 md:top-40 transform translate-x-1/2 flex flex-col items-center gap-0 z-30">
            <div className="relative">
              <img src="/assets/gear-large.webp" alt="" className="w-40 md:w-48 animate-spin-slow" />
              <img src="/assets/bolt-hex.webp" alt="" className="absolute inset-0 m-auto w-10 md:w-12" />
            </div>
            <div className="relative -mt-12">
              <img src="/assets/gear-medium.webp" alt="" className="w-28 md:w-32 animate-spin-slower" />
              <img src="/assets/bolt-slotted.webp" alt="" className="absolute inset-0 m-auto w-7 md:w-8" />
            </div>
            <div className="relative -mt-10">
              <img src="/assets/gear-small.webp" alt="" className="w-20 md:w-24 animate-spin-slow" />
              <img src="/assets/bolt-rivet.webp" alt="" className="absolute inset-0 m-auto w-5 md:w-6" />
            </div>
          </div>

        </div>

        {/* Основное содержимое с толстой внешней границей */}
        <div className="relative z-10 bg-[#171512] border-4 border-[#c99a40] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          
          {/* Шапка с логотипом и паром */}
          <header className="relative bg-gradient-to-b from-[#1a1611] to-[#15120e] border-b-2 border-[#2a2824] p-8">
            
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                {/* Пар прямо на логотипе - увеличенный в 2 раза */}
                <img
                  src="/assets/logo.webp"
                  srcSet="/assets/logo@2x.webp 2x"
                  alt="REXANT"
                  className="h-56 md:h-72 w-auto animate-float-slow drop-shadow-[0_0_12px_rgba(227,27,35,.4)]"
                  decoding="async"
                  loading="eager"
                />
                {/* Два крупных эффекта пара прямо на логотипе */}
                <img 
                  src="/assets/steam.webp" 
                  alt="" 
                  className="absolute top-4 left-8 w-16 h-16 opacity-70 animate-steam-slow" 
                />
                <img 
                  src="/assets/steam.webp" 
                  alt="" 
                  className="absolute top-4 right-8 w-16 h-16 opacity-70 animate-steam-delay" 
                />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#e6d8b8] mb-2">
                Обратная связь
              </h1>
              <p className="text-lg text-[#c8b890] opacity-90">
                Расскажите о ваших потребностях и впечатлениях
              </p>
            </div>
          </header>

          {/* Форма */}
          <div className="p-8">
            <form
              onSubmit={onSubmit}
              className="relative bg-[#191714]/95 border-2 border-[#3a3529] rounded-xl p-8 shadow-[0_10px_30px_rgba(0,0,0,.5),inset_0_0_0_1px_rgba(255,255,255,.04)] backdrop-blur-[1px]"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-[#e6d8b8] mb-3">Контактная информация</h2>
                <p className="text-base text-[#c8b890] opacity-85">
                  Поля со звёздочкой <span className="text-[#c99a40]">*</span> обязательны для заполнения
                </p>
              </div>

              {/* Имя и телефон */}
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Ваше имя *">
                  <input
                    className="input"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                    placeholder="Ваше имя"
                  />
                </Field>
                <Field label="Контактный телефон *">
                  <input
                    className="input"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    required
                    placeholder="+7 999 000-00-00"
                  />
                </Field>
              </div>

              {/* Удобный способ связи */}
              <div className="mt-6">
                <label className="block">
                  <span className="block text-base font-medium text-[#c8b890] mb-3">Удобный способ связи *</span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.contact_methods.includes('Telegram')}
                        onChange={() => toggleCheckbox('contact_methods','Telegram')}
                        className="form-checkbox"
                      />
                      <span>Telegram</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.contact_methods.includes('WhatsApp')}
                        onChange={() => toggleCheckbox('contact_methods','WhatsApp')}
                        className="form-checkbox"
                      />
                      <span>WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.contact_methods.includes('Телефон')}
                        onChange={() => toggleCheckbox('contact_methods','Телефон')}
                        className="form-checkbox"
                      />
                      <span>Телефон</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.contact_methods.includes('Другое')}
                        onChange={() => toggleCheckbox('contact_methods','Другое')}
                        className="form-checkbox"
                      />
                      <span>Другое</span>
                      {form.contact_methods.includes('Другое') && (
                        <input
                          className="input ml-2 flex-1"
                          name="contact_other"
                          value={form.contact_other}
                          onChange={onChange}
                          placeholder="Укажите другой способ"
                        />
                      )}
                    </label>
                  </div>
                </label>
              </div>

              {/* Ссылка на соцсеть и Род деятельности */}
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Field label="Ссылка на ваш канал/социальную сеть">
                  <input
                    className="input"
                    name="social_link"
                    value={form.social_link}
                    onChange={onChange}
                    placeholder="https://t.me/yourchannel"
                  />
                </Field>
                <Field label="Род деятельности / Тематика блога">
                  <input
                    className="input"
                    name="activity"
                    value={form.activity}
                    onChange={onChange}
                    placeholder="Тематика блога или рода деятельности"
                  />
                </Field>
              </div>

              {/* Как узнали о компании */}
              <div className="mt-6">
                <label className="block">
                  <span className="block text-base font-medium text-[#c8b890] mb-3">Как вы узнали о нашей компании? *</span>
                  <div className="flex flex-col gap-2">
                    {['Выставка','Форум / Конференция','Премия DIY','Социальные сети','Реклама','Рекомендация'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="heard_about"
                          value={opt}
                          checked={form.heard_about === opt}
                          onChange={() => setForm((prev) => ({ ...prev, heard_about: opt, heard_about_other: '' }))}
                          className="form-radio"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="heard_about"
                        value="Другое"
                        checked={form.heard_about === 'Другое'}
                        onChange={() => setForm((prev) => ({ ...prev, heard_about: 'Другое' }))}
                        className="form-radio"
                      />
                      <span>Другое</span>
                      {form.heard_about === 'Другое' && (
                        <input
                          className="input ml-2 flex-1"
                          name="heard_about_other"
                          value={form.heard_about_other}
                          onChange={onChange}
                          placeholder="Уточните"
                        />
                      )}
                    </label>
                  </div>
                </label>
              </div>

              {/* Формат сотрудничества */}
              <div className="mt-6">
                <label className="block">
                  <span className="block text-base font-medium text-[#c8b890] mb-3">Какой формат сотрудничества вам интересен? *</span>
                  <div className="flex flex-col gap-2">
                    {['Обзоры и тесты продуктов','Совместные мероприятия','Стать партнером/клиентом'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.cooperation.includes(opt)}
                          onChange={() => toggleCheckbox('cooperation', opt)}
                          className="form-checkbox"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.cooperation.includes('Другое')}
                        onChange={() => toggleCheckbox('cooperation','Другое')}
                        className="form-checkbox"
                      />
                      <span>Другое</span>
                      {form.cooperation.includes('Другое') && (
                        <input
                          className="input ml-2 flex-1"
                          name="cooperation_other"
                          value={form.cooperation_other}
                          onChange={onChange}
                          placeholder="Уточните"
                        />
                      )}
                    </label>
                  </div>
                </label>
              </div>

              {/* Дополнительные комментарии */}
              <div className="mt-6">
                <Field label="Если у вас есть дополнительные комментарии или пожелания, напишите их">
                  <textarea
                    className="input"
                    rows={3}
                    name="comments"
                    value={form.comments}
                    onChange={onChange}
                    placeholder="Ваши комментарии…"
                  />
                </Field>
              </div>

              {/* honeypot – скрытое поле для антиспама */}
              <input
                type="text"
                className="absolute -left-[9999px] opacity-0"
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
              />

              {/* Кнопки */}
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  disabled={!canSubmit}
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed text-lg px-8 py-3"
                >
                  Отправить
                </button>
                <button
                  type="button"
                  className="btn btn--ghost text-lg px-6 py-3"
                  onClick={() => {
                    setForm({
                      name: "", phone: "", contact_methods: [], contact_other: "",
                      social_link: "", activity: "", heard_about: "", heard_about_other: "",
                      cooperation: [], cooperation_other: "", comments: "",
                    });
                    setStatus("Форма очищена.");
                  }}
                >
                  Очистить форму
                </button>
                <div
                  className={`status flex-1 min-w-[250px] text-base ${
                    status.includes("Готово") ? "ok" :
                    status.includes("Ошибка") ? "err" : ""
                  }`}
                >
                  {status}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

/** маленький вспомогательный компонент для компактной вёрстки полей */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-base font-medium text-[#c8b890] mb-3">{label}</span>
      {children}
    </label>
  );
}