// src/Admin.jsx (с экспортом XLSX)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx"; // ← ДОБАВИЛИ

const PAGE_SIZE = 20;

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendMagicLink(e) {
    e.preventDefault();
    setAuthMsg("Отправляем ссылку/код на почту…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setAuthMsg(error ? "Ошибка: " + error.message : "Проверьте почту.");
  }

  async function signOut() { await supabase.auth.signOut(); }

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const range = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    return { from, to };
  }, [page]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let head = supabase.from("responses").select("*", { count: "exact", head: true });
      head = applyFilters(head, q, dateFrom, dateTo);
      const headRes = await head;
      if (headRes.error) { console.error(headRes.error); return; }
      setTotal(headRes.count || 0);

      let query = supabase
        .from("responses")
        .select(
          "id, created_at, name, phone, contact_methods, contact_other, social_link, activity, heard_about, heard_about_other, cooperation, cooperation_other, comments",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(range.from, range.to);

      query = applyFilters(query, q, dateFrom, dateTo);

      const { data, error } = await query;
      if (error) { console.error(error); return; }
      setRows(data || []);
    })();
  }, [user, page, q, dateFrom, dateTo, range.from, range.to]);

  function applyFilters(qb, q, from, to) {
    if (q) {
      qb = qb.or([
        `name.ilike.%${q}%`,
        `phone.ilike.%${q}%`,
        `activity.ilike.%${q}%`,
        `social_link.ilike.%${q}%`,
        `comments.ilike.%${q}%`,
      ].join(","));
    }
    if (from) qb = qb.gte("created_at", from);
    if (to)   qb = qb.lte("created_at", to + " 23:59:59");
    return qb;
  }

  // === НОВОЕ: экспорт в XLSX текущей страницы ===
  function exportXLSX() {
    const header = [
      "Дата/время","Имя","Телефон","Способ связи","Ссылка","Деятельность",
      "Как узнали","Формат сотрудничества","Комментарий",
    ];

    const data = rows.map(r => {
      // формируем человекочитаемые строки из массивов и отдельных полей
      const contact = `${(r.contact_methods || []).join(', ')}${r.contact_other ? ` (${r.contact_other})` : ''}`;
      const heard = `${safe(r.heard_about)}${r.heard_about_other ? ` (${r.heard_about_other})` : ''}`;
      const coop = `${(r.cooperation || []).join(', ')}${r.cooperation_other ? ` (${r.cooperation_other})` : ''}`;
      return [
        new Date(r.created_at).toLocaleString(),
        safe(r.name), safe(r.phone), contact, safe(r.social_link), safe(r.activity), heard, coop, safe(r.comments),
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

    // автоподбор ширины колонок
    const colWidths = header.map((_, i) => {
      const maxLen = Math.max(
        String(header[i]).length,
        ...data.map(row => String(row[i] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 50) }; // границы на всякий
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Лиды (страница)");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `responses_page${page}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // (опционально) экспорт всех записей с учётом фильтров
  // запросит все строки (ограничь по ситуации, если данных очень много)
  async function exportAllXLSX() {
    let query = supabase
      .from("responses")
      .select(
        "created_at, name, phone, contact_methods, contact_other, social_link, activity, heard_about, heard_about_other, cooperation, cooperation_other, comments",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    query = applyFilters(query, q, dateFrom, dateTo);

    const { data, error } = await query;
    if (error) { console.error(error); return; }

    const header = [
      "Дата/время","Имя","Телефон","Способ связи","Ссылка","Деятельность",
      "Как узнали","Формат сотрудничества","Комментарий",
    ];
    const rowsAll = (data || []).map(r => {
      const contact = `${(r.contact_methods || []).join(', ')}${r.contact_other ? ` (${r.contact_other})` : ''}`;
      const heard = `${safe(r.heard_about)}${r.heard_about_other ? ` (${r.heard_about_other})` : ''}`;
      const coop = `${(r.cooperation || []).join(', ')}${r.cooperation_other ? ` (${r.cooperation_other})` : ''}`;
      return [
        new Date(r.created_at).toLocaleString(),
        safe(r.name), safe(r.phone), contact, safe(r.social_link), safe(r.activity), heard, coop, safe(r.comments),
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rowsAll]);
    ws["!cols"] = header.map((_, i) => {
      const maxLen = Math.max(
        String(header[i]).length,
        ...rowsAll.map(row => String(row[i] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Лиды (все)");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `responses_all.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <Wrap>
        <Card>
          <H1>Админ-панель REXANT</H1>
          <P>Введите корпоративную почту — пришлём ссылку/код для входа.</P>
          <form onSubmit={sendMagicLink} style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <Input type="email" required placeholder="you@company.ru" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <Btn>Получить ссылку для входа</Btn>
            <Note>{authMsg}</Note>
          </form>
        </Card>
      </Wrap>
    );
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Wrap>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 1200 }}>
        <H1>Лиды (всего: {total})</H1>
        <BtnGhost onClick={signOut}>Выйти</BtnGhost>
      </div>

      <Card style={{ width: "100%", maxWidth: 1200, marginTop: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 160px 160px 180px 160px" }}>
          <Input placeholder="Поиск: имя / телефон / деятельность / ссылка / комментарий" value={q} onChange={(e)=>{ setPage(1); setQ(e.target.value); }} />
          <Input type="date" value={dateFrom} onChange={(e)=>{ setPage(1); setDateFrom(e.target.value); }} />
          <Input type="date" value={dateTo} onChange={(e)=>{ setPage(1); setDateTo(e.target.value); }} />
          <Btn onClick={exportXLSX}>Экспорт XLSX</Btn> {/* ← ИЗМЕНИЛИ */}
          <BtnGhost onClick={exportAllXLSX}>Все в XLSX</BtnGhost> {/* ← по желанию */}
        </div>
      </Card>

      <Card style={{ width: "100%", maxWidth: 1200, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>{["Дата/время","Имя","Телефон","Способ связи","Ссылка","Деятельность","Как узнали","Формат сотрудничества","Комментарий"].map(h=><Th key={h}>{h}</Th>)}</tr>
          </thead>
        <tbody>
          {rows.map(r=>{
            // преобразуем массивы и доп. поля в единую строку для отображения
            const contact = `${(r.contact_methods || []).join(', ')}${r.contact_other ? ` (${r.contact_other})` : ''}`;
            const heard = `${safe(r.heard_about)}${r.heard_about_other ? ` (${r.heard_about_other})` : ''}`;
            const coop = `${(r.cooperation || []).join(', ')}${r.cooperation_other ? ` (${r.cooperation_other})` : ''}`;
            return (
              <tr key={r.id}>
                <Td>{new Date(r.created_at).toLocaleString()}</Td>
                <Td>{safe(r.name)}</Td>
                <Td>{safe(r.phone)}</Td>
                <Td>{contact}</Td>
                <Td>{safe(r.social_link)}</Td>
                <Td>{safe(r.activity)}</Td>
                <Td>{heard}</Td>
                <Td>{coop}</Td>
                <Td>{safe(r.comments)}</Td>
              </tr>
            );
          })}
          {!rows.length && <tr><Td colSpan={10} style={{opacity:.7}}>Ничего не найдено.</Td></tr>}
        </tbody>
        </table>
      </Card>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <BtnGhost disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Назад</BtnGhost>
        <Note>стр. {page} / {pages}</Note>
        <Btn disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Вперёд →</Btn>
      </div>
    </Wrap>
  );
}

function Wrap({ children }) { return <main style={{minHeight:"100vh",display:"grid",justifyItems:"center",alignContent:"start",gap:12,padding:16,background:"#0b0a08",color:"#f2e9d0"}}>{children}</main>; }
function Card({ children, style }) { return <section style={{background:"#171512",border:"1px solid #2a2824",borderRadius:12,padding:16,boxShadow:"0 10px 30px rgba(0,0,0,.45)",...style}}>{children}</section>; }
function H1({ children }) { return <h1 style={{ margin: 0 }}>{children}</h1>; }
function P({ children }) { return <p style={{ margin: "8px 0", opacity: 0.8 }}>{children}</p>; }
function Note({ children }) { return <div style={{ fontSize: 12, color: "#c8b890" }}>{children}</div>; }
function Input(props){ return <input {...props} style={{padding:"10px 12px",borderRadius:8,background:"#0f0d0b",border:"1px solid #3a332a",color:"#f2e9d0",...(props.style||{})}}/>; }
function Btn({ children, ...rest }){ return <button {...rest} style={{appearance:"none",border:"none",cursor:"pointer",padding:"10px 14px",borderRadius:10,fontWeight:700,background:"linear-gradient(180deg,#e31b23,#b7151b)",color:"#fff",boxShadow:"0 8px 22px rgba(227,27,35,.28), inset 0 0 0 1px rgba(255,255,255,.2)",opacity:rest.disabled?0.6:1}}>{children}</button>; }
function BtnGhost({ children, ...rest }){ return <button {...rest} style={{appearance:"none",cursor:"pointer",padding:"10px 14px",borderRadius:10,fontWeight:700,background:"linear-gradient(180deg,#1c1916,#14120f)",border:"1px solid #8b6b2a",color:"#f2e9d0",opacity:rest.disabled?0.6:1}}>{children}</button>; }
function Th({ children }){ return <th style={{textAlign:"left",padding:10,position:"sticky",top:0,background:"#191714",borderBottom:"1px solid #2a2824"}}>{children}</th>; }
function Td({ children, colSpan }){ return <td colSpan={colSpan} style={{padding:10,borderTop:"1px solid #2a2824"}}>{children}</td>; }
function safe(v){ return v ?? ""; }
