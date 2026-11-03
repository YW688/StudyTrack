import type { RefObject } from "react";
import type {
  Experience,
  ResumeBasics,
  ResumeBullet,
  ResumeBulletCache,
  ResumeTemplateId,
} from "../types";
import { formatExperienceRange } from "../lib/experience";
import {
  collectLinks,
  collectSkills,
  contactParts,
  educationParts,
  rawDisplayBullets,
} from "../lib/resume";

export interface ResumePaperEntry {
  experience: Experience;
  concise: boolean;
  cache?: ResumeBulletCache;
}

interface ResumePaperProps {
  basics: ResumeBasics;
  entries: ResumePaperEntry[];
  template?: ResumeTemplateId;
  photo?: string | null;
  frameRef?: RefObject<HTMLDivElement | null>;
  paperRef?: RefObject<HTMLDivElement | null>;
}

function entryBullets(entry: ResumePaperEntry): ResumeBullet[] {
  const source =
    entry.cache && entry.cache.bullets.length > 0
      ? entry.cache.bullets
      : rawDisplayBullets(entry.experience);
  return source.slice(0, entry.concise ? 1 : 3);
}

export default function ResumePaper({
  basics,
  entries,
  template = "classic",
  photo,
  frameRef,
  paperRef,
}: ResumePaperProps) {
  const contact = contactParts(basics);
  const education = educationParts(basics);
  const experiences = entries.map((entry) => entry.experience);
  const skills = collectSkills(experiences);
  const links = collectLinks(experiences);

  return (
    <div className="paper-frame" ref={frameRef}>
      <div
        className="resume-paper"
        ref={paperRef}
        aria-label="A4 简历预览"
        data-resume-paper="true"
        data-template={template}
      >
        <div className="resume-body">
          <header className="resume-head">
            <div className="resume-head-main">
              <h1 className="resume-name">
                {basics.name.trim() || "个人简历"}
              </h1>
              {basics.target.trim() && (
                <p className="resume-target">
                  求职意向：{basics.target.trim()}
                </p>
              )}
            </div>
            <div className="resume-head-side">
              {contact.length > 0 && (
                <p className="resume-contact">{contact.join(" · ")}</p>
              )}
              {photo && (
                <img className="resume-photo" src={photo} alt="简历照片" />
              )}
            </div>
          </header>

          {education.length > 0 && (
            <section className="resume-section resume-section--education">
              <h2 className="resume-section-title">教育</h2>
              <div className="resume-section-body">
                <p className="resume-education">{education.join(" · ")}</p>
              </div>
            </section>
          )}

          <section className="resume-section resume-section--experience">
            <h2 className="resume-section-title">经历</h2>
            <div className="resume-section-body">
              {entries.length === 0 ? (
                <p className="resume-empty screen-only">
                  从左侧选经历 这里实时更新
                </p>
              ) : (
                entries.map((entry) => {
                  const experience = entry.experience;
                  const bullets = entryBullets(entry);
                  return (
                    <article
                      key={experience.id}
                      className="resume-entry"
                      data-resume-entry="true"
                    >
                      <div className="resume-entry-head">
                        <div className="resume-entry-title-wrap">
                          <h3 className="resume-entry-title">
                            {experience.title}
                          </h3>
                          {experience.org && (
                            <p className="resume-entry-org">{experience.org}</p>
                          )}
                        </div>
                        <p className="resume-date">
                          {formatExperienceRange(
                            experience.start,
                            experience.end,
                          )}
                        </p>
                      </div>

                      {bullets.length > 0 ? (
                        <ul className="resume-bullets">
                          {bullets.map((bullet) => (
                            <li key={bullet.id} className="resume-bullet">
                              {bullet.text}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="resume-entry-empty screen-only">
                          四段式为空 只显示标题
                        </p>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {skills.length > 0 && (
            <section className="resume-section resume-section--skills">
              <h2 className="resume-section-title">技能</h2>
              <div className="resume-section-body">
                <p className="resume-skills">{skills.join(" · ")}</p>
              </div>
            </section>
          )}

          {links.length > 0 && (
            <section className="resume-section resume-section--links">
              <h2 className="resume-section-title">作品链接</h2>
              <div className="resume-section-body">
                <ul className="resume-links">
                  {links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {link.label}
                      </a>
                      <span className="resume-link-url">{link.url}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
      <div className="a4-guide screen-only" aria-hidden="true">
        <span>A4 边界</span>
      </div>
    </div>
  );
}
