import Link from "next/link";
import { FaGithub } from "react-icons/fa";

const Footer = () => {
  const teamMembers = [
    { name: "박민재", github: "https://github.com/boonmojae" },
    { name: "김도이", github: "https://github.com/d0ikim" },
    { name: "김가연", github: "https://github.com/gayeon-00" },
    { name: "최아름", github: "https://github.com/Haleychoioi" },
    { name: "이하민", github: "https://github.com/haminee01" },
  ];

  return (
    <footer className="border-t border-gray-200/70 bg-white/70">
      <div className="content-container py-6 sm:py-8">
        <div className="border-b border-gray-200/60 mb-6 sm:mb-10"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary mb-3 sm:mb-5">
              Team
            </h3>
            <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3">
              {teamMembers.map((member, index) => (
                <Link
                  key={index}
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-text-muted hover:text-primary"
                >
                  {member.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Link
              href="https://github.com/b1a4-CafeOn-final"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-text-primary rounded-full hover:scale-105"
            >
              <FaGithub className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
