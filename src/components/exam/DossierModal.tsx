"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Calendar, User, Award, GraduationCap, Briefcase } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface DossierData {
  id?: string
  user_id: string
  photo_url?: string
  program_name?: string
  position?: string
  territory?: string
  age?: number
  experience_in_position?: string
  education?: {
    level?: string
    institution?: string
    specialty?: string
  }
  career_path?: string
  achievements?: string[]
  created_at?: string
  updated_at?: string
}

interface UserData {
  id: string
  full_name: string
  email: string
  sap_number: string
  work_experience_days?: number
  position?: { name: string }
  territory?: { name: string }
}

interface DossierModalProps {
  isOpen: boolean
  onClose: () => void
  participantId: string
}

const DossierModal: React.FC<DossierModalProps> = ({ isOpen, onClose, participantId }) => {
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && participantId) {
      loadDossierData()
    }
  }, [isOpen, participantId])

  // Скрываем основное меню при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      // Скрываем мобильную навигацию
      const mobileNav = document.querySelector('.mobile-exam-nav') as HTMLElement
      if (mobileNav) {
        mobileNav.style.display = 'none'
      }
    } else {
      // Показываем мобильную навигацию обратно
      const mobileNav = document.querySelector('.mobile-exam-nav') as HTMLElement
      if (mobileNav) {
        mobileNav.style.display = ''
      }
    }

    // Cleanup при размонтировании
    return () => {
      const mobileNav = document.querySelector('.mobile-exam-nav') as HTMLElement
      if (mobileNav) {
        mobileNav.style.display = ''
      }
    }
  }, [isOpen])

  const loadDossierData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Загружаем данные пользователя с правильными связями
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          sap_number,
          work_experience_days,
          position:positions(name),
          territory:territories(name)
        `)
        .eq("id", participantId)
        .single()

      if (userError) {
        console.error("Ошибка загрузки пользователя:", userError)
        throw userError
      }

      console.log("Загруженные данные пользователя:", userData)
      
      // Преобразуем данные в нужный формат
      const processedUserData: UserData = {
        id: userData.id,
        full_name: userData.full_name,
        email: userData.email,
        sap_number: userData.sap_number,
        work_experience_days: userData.work_experience_days,
        position: userData.position ? { name: (userData.position as any).name } : undefined,
        territory: userData.territory ? { name: (userData.territory as any).name } : undefined
      }
      
      console.log("Обработанные данные пользователя:", processedUserData)
      setUserData(processedUserData)

      // Загружаем досье отдельно
      const { data: dossierData, error: dossierError } = await supabase
        .from("participant_dossiers")
        .select("*")
        .eq("user_id", participantId)
        .single()

      if (dossierError && dossierError.code !== 'PGRST116') {
        console.warn("Ошибка загрузки досье:", dossierError)
      }

      setDossier(dossierData || null)

    } catch (err) {
      console.error("Ошибка загрузки досье:", err)
      setError("Не удалось загрузить данные досье")
    } finally {
      setLoading(false)
    }
  }

  const formatExperience = (days?: number, fallback?: string) => {
    if (fallback) return fallback
    if (!days || days <= 0) return "Нет данных"
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    const y = years > 0 ? `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}` : ""
    const m = months > 0 ? `${months} ${months === 1 ? "месяц" : months < 5 ? "месяца" : "месяцев"}` : ""
    return [y, m].filter(Boolean).join(" ") || "Нет данных"
  }

  const splitName = (full: string) => {
    if (!full) return { top: "", bottom: "" }
    const parts = full.trim().split(/\s+/)
    if (parts.length === 1) return { top: parts[0], bottom: "" }
    return { top: parts[0], bottom: parts.slice(1).join(" ") }
  }

  if (!isOpen) return null

  const nameParts = userData ? splitName(userData.full_name) : { top: "", bottom: "" }
  const position = dossier?.position || userData?.position?.name || "Не указано"
  const territory = dossier?.territory || userData?.territory?.name || "Не указано"
  const experience = userData ? formatExperience(userData.work_experience_days, dossier?.experience_in_position) : ""

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
      {/* Модальное окно */}
      <div className="flex items-center justify-center p-4 h-full">
        <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Хедер с кнопкой закрытия */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">Досье резервиста</h1>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Закрепленная шапка с фото, ФИО и должностью */}
          <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-100 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-emerald-600 rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
            ) : (
              <div className="flex gap-4">
                {/* Фото */}
                <div className="relative shrink-0">
                  <div className="h-[120px] w-[100px] rounded-2xl bg-gray-100 border border-gray-200/60 overflow-hidden shadow-sm">
                    {dossier?.photo_url ? (
                      <img
                        src={dossier.photo_url || "/placeholder.svg"}
                        alt={userData?.full_name || "Фото"}
                        loading="lazy"
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        {userData?.full_name ? (
                          <span
                            className="text-xl font-bold"
                            style={{
                              color: "#06A478",
                              fontFamily: "SNS, sans-serif",
                            }}
                          >
                            {userData.full_name
                              .split(/\s+/)
                              .map((s) => s[0]?.toUpperCase())
                              .filter(Boolean)
                              .join("")}
                          </span>
                        ) : (
                          <User className="w-6 h-6" style={{ color: "#06A478", opacity: 0.6 }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Информация */}
                <div className="min-w-0 flex-1">
                  {/* ФИО */}
                  <div className="mb-2 leading-none">
                    <div
                      className="text-[20px] font-extrabold tracking-wide uppercase truncate"
                      style={{
                        color: "#06A478",
                        fontFamily: "SNS, sans-serif",
                      }}
                    >
                      {nameParts.top}
                    </div>
                    {nameParts.bottom ? (
                      <div
                        className="text-[20px] font-extrabold tracking-wide uppercase truncate"
                        style={{
                          color: "#06A478",
                          fontFamily: "SNS, sans-serif",
                        }}
                      >
                        {nameParts.bottom}
                      </div>
                    ) : null}
                  </div>

                  {/* Должность и филиал */}
                  <div className="text-[14px] text-gray-700 leading-tight font-medium">
                    {position}
                  </div>
                  <div className="text-[14px] text-gray-700 leading-tight font-medium">
                    {territory}
                  </div>

                  {/* Возраст и стаж */}
                  <div className="mt-2 flex items-center gap-4 flex-wrap">
                    {dossier?.age && (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-white text-[11px] font-medium shadow-sm"
                        style={{ backgroundColor: "#06A478" }}
                      >
                        {dossier.age} лет
                      </span>
                    )}
                    {experience && (
                      <span className="inline-flex items-center text-[13px] text-gray-600">
                        <Calendar className="w-3 h-3 mr-1" />
                        {experience}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Прокручиваемый контент */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-gray-600">{error}</p>
                </div>
              ) : (
                <>
                  {/* Контент */}
                  <div className="space-y-6">
                    {/* Образование */}
                    {dossier?.education && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" style={{ color: "#06A478" }} />
                          Образование
                        </h3>
                        <div className="space-y-2">
                          {dossier.education.level && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Уровень:</span> {dossier.education.level}
                            </div>
                          )}
                          {dossier.education.institution && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Учебное заведение:</span> {dossier.education.institution}
                            </div>
                          )}
                          {dossier.education.specialty && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Специальность:</span> {dossier.education.specialty}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Карьерный путь */}
                    {dossier?.career_path && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Briefcase className="w-5 h-5" style={{ color: "#06A478" }} />
                          Карьерный путь
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{dossier.career_path}</p>
                      </div>
                    )}

                    {/* Достижения - компактный стиль */}
                    {dossier?.achievements && dossier.achievements.length > 0 && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5" style={{ color: "#06A478" }} />
                          Достижения
                        </h3>
                        <div className="space-y-2">
                          {dossier.achievements.map((achievement, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors duration-200"
                            >
                              <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#06A478" }}></div>
                              <span className="text-sm text-gray-700 leading-relaxed">{achievement}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

           {/* Фиксированный футер с кнопками */}
           <div className="flex-shrink-0 bg-white border-t border-gray-100 p-4 md:p-6">
             <div className="flex gap-3">
               {/* Кнопка "Закрыть" - вторичная */}
               <button
                 onClick={onClose}
                 className="flex-1 px-6 py-3.5 bg-white text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98]"
               >
                 Закрыть
               </button>

               {/* Кнопка "Оценить" - основная */}
               <button
                 onClick={() => {
                   // Здесь можно добавить логику оценки
                   console.log("Оценка участника:", participantId)
                   onClose()
                 }}
                 className="flex-1 px-6 py-3.5 text-white rounded-xl font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] relative overflow-hidden group"
                 style={{ backgroundColor: "#06A478" }}
               >
                 {/* Эффект свечения при наведении */}
                 <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                 <span className="relative">Оценить</span>
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default DossierModal
