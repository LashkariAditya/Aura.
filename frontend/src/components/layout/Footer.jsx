import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="border-t border-border bg-background pt-24 pb-12 px-12 transition-colors duration-500">
            <div className="max-w-[1920px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-8">
                    {/* Column 1: Logo */}
                    <div className="flex flex-col items-center lg:items-start">
                        <div className="w-32 h-32 border border-foreground rounded-full flex items-center justify-center p-8 mb-8 group overflow-hidden relative cursor-pointer">
                            <span className="text-xl font-bold tracking-tighter uppercase relative z-10 group-hover:text-background transition-colors duration-500 text-foreground">AURA.</span>
                            <div className="absolute inset-0 bg-foreground translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out"></div>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-medium">© 2026 AURA MUSIC</p>
                    </div>

                    {/* Column 2: Connect */}
                    <div className="flex flex-col space-y-6">
                        <h4 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-medium">CONNECT</h4>
                        <div className="flex flex-col space-y-3 text-[14px] font-light text-foreground">
                            <a href="#" className="hover:text-foreground hover:underline transition-colors w-fit">INSTAGRAM</a>
                            <a href="#" className="hover:text-foreground hover:underline transition-colors w-fit">LINKEDIN</a>
                            <a href="#" className="hover:text-foreground hover:underline transition-colors w-fit">TWITTER / X</a>
                            <a href="#" className="hover:text-foreground hover:underline transition-colors w-fit">SPOTIFY</a>
                        </div>
                    </div>

                    {/* Column 3: Contact */}
                    <div className="flex flex-col space-y-6">
                        <h4 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-medium">CONTACT</h4>
                        <div className="flex flex-col space-y-3 text-[14px] font-light text-foreground">
                            <a href="mailto:hello@aura-music.com" className="hover:underline transition-all w-fit">HELLO@AURA-MUSIC.COM</a>
                            <p>+1 212 555 0192</p>
                            <p className="mt-4 text-gray-500">SUPPORT HOURS:<br />9AM - 6PM EST</p>
                        </div>
                    </div>

                    {/* Column 4: Offices */}
                    <div className="flex flex-col space-y-6">
                        <h4 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-medium">OFFICES</h4>
                        <div className="grid grid-cols-2 gap-4 text-[13px] font-light text-foreground">
                            <div className="space-y-1">
                                <p className="font-medium">NEW YORK</p>
                                <p className="text-gray-500 text-[11px] leading-relaxed">249 CANAL ST.<br />NY 10013, USA</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium">COPENHAGEN</p>
                                <p className="text-gray-500 text-[11px] leading-relaxed">SKTO. HANS TORV 2<br />2200 N, DK</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-24 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-400 tracking-widest uppercase font-medium">
                    <div className="flex space-x-8 mb-4 md:mb-0">
                        <Link to="/privacy" className="hover:text-foreground transition-colors">PRIVACY POLICY</Link>
                        <Link to="/terms" className="hover:text-foreground transition-colors">TERMS OF SERVICE</Link>
                        <Link to="/cookies" className="hover:text-foreground transition-colors">COOKIES</Link>
                    </div>
                    <p>DESIGNED AND DEVELOP BY Aditya Lashkari</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
