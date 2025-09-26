import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import Link from "next/link";
import MainNavbar from "../../components/MainNavbar";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <MainNavbar />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 text-sm font-semibold">
            🏛️ Kamu Sektörü Odaklı
          </Badge>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-tight">
            <span className="gradient-text">Hakkımızda</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
            Kamu kurumlarının dijital dönüşüm sürecinde ihtiyaç duyduğu sosyal medya yönetim çözümünü 
            <span className="text-purple-600 font-semibold"> açık kaynak</span> olarak geliştiriyoruz.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <Card className="border-0 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <Badge className="bg-blue-100 text-blue-700 mb-2">🎯 Misyonumuz</Badge>
              <CardTitle className="text-3xl font-bold text-gray-900">Dijital Köprü</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-lg leading-relaxed">
                Kamu kurumları ile vatandaşlar arasında güçlü bir dijital köprü kurmak. Modern teknoloji ile 
                şeffaf, erişilebilir ve etkili iletişimi mümkün kılmak. Açık kaynak felsefesi ile 
                sürdürülebilir çözümler geliştirmek.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl hover:shadow-pink-500/20 transition-all duration-500">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 gradient-secondary rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <Badge className="bg-pink-100 text-pink-700 mb-2">🔮 Vizyonumuz</Badge>
              <CardTitle className="text-3xl font-bold text-gray-900">Geleceğin Kamu Hizmeti</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-lg leading-relaxed">
                Türkiye'nin dijital kamu hizmetlerinde öncü olmak. Tüm kamu kurumlarının sosyal medya 
                varlığını güçlendirerek, vatandaş memnuniyetini artırmak ve demokratik katılımı desteklemek.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Values */}
        <Card className="mb-20 border-0 shadow-xl">
          <CardHeader className="text-center pb-8">
            <Badge className="bg-green-100 text-green-700 mb-4 mx-auto">💎 Değerlerimiz</Badge>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-4">Temel İlkelerimiz</CardTitle>
            <CardDescription className="text-lg text-gray-600 max-w-3xl mx-auto">
              Projemizi yönlendiren core değerler ve prensipler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 gradient-tertiary rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">🛡️ Güvenlik</h3>
                <p className="text-gray-600 leading-relaxed">
                  Kamu verilerinin güvenliği en öncelikli konumuz. End-to-end şifreleme ve modern güvenlik protokolleri.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 gradient-quaternary rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">🌟 Şeffaflık</h3>
                <p className="text-gray-600 leading-relaxed">
                  Açık kaynak felsefesi ile tam şeffaflık. Kod, süreç ve kararlarımız toplulukla paylaşılır.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">⚡ İnovasyon</h3>
                <p className="text-gray-600 leading-relaxed">
                  Sürekli öğrenme ve gelişim. En yeni teknolojileri kamu hizmetine entegre etme.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card className="mb-20 border-0 shadow-xl">
          <CardHeader className="text-center pb-8">
            <Badge className="bg-purple-100 text-purple-700 mb-4 mx-auto">⚙️ Teknoloji</Badge>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-4">Teknoloji Yığınımız</CardTitle>
            <CardDescription className="text-lg text-gray-600 max-w-3xl mx-auto">
              Modern, ölçeklenebilir ve güvenli teknolojiler kullanıyoruz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">⚛️</div>
                <h4 className="font-bold text-blue-900 mb-2">Frontend</h4>
                <p className="text-sm text-blue-700">Next.js, React, TypeScript, Tailwind CSS</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">🗄️</div>
                <h4 className="font-bold text-green-900 mb-2">Backend</h4>
                <p className="text-sm text-green-700">Node.js, Express, PostgreSQL, Redis</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">☁️</div>
                <h4 className="font-bold text-purple-900 mb-2">Cloud</h4>
                <p className="text-sm text-purple-700">Docker, Kubernetes, AWS/Azure</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">🔧</div>
                <h4 className="font-bold text-orange-900 mb-2">DevOps</h4>
                <p className="text-sm text-orange-700">CI/CD, Monitoring, Security</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        <Card className="mb-20 border-0 shadow-xl">
          <CardHeader className="text-center pb-8">
            <Badge className="bg-indigo-100 text-indigo-700 mb-4 mx-auto">👥 Topluluk</Badge>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-4">Açık Kaynak Topluluğu</CardTitle>
            <CardDescription className="text-lg text-gray-600 max-w-3xl mx-auto">
              Projeyi birlikte geliştiren gönüllü katkıcılar ve uzmanlar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center space-x-8 mb-12">
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 gradient-primary shadow-xl">
                  <AvatarFallback className="text-white font-bold text-2xl">KS</AvatarFallback>
                </Avatar>
                <div className="font-bold text-gray-900 text-lg">Kamu Sektörü</div>
                <div className="text-purple-600 font-medium">Uzmanları</div>
                <div className="text-sm text-gray-500 mt-2">Dijital dönüşüm deneyimi</div>
              </div>
              
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 gradient-secondary shadow-xl">
                  <AvatarFallback className="text-white font-bold text-2xl">TG</AvatarFallback>
                </Avatar>
                <div className="font-bold text-gray-900 text-lg">Teknoloji</div>
                <div className="text-pink-600 font-medium">Geliştiricileri</div>
                <div className="text-sm text-gray-500 mt-2">Full-stack development</div>
              </div>
              
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 gradient-tertiary shadow-xl">
                  <AvatarFallback className="text-white font-bold text-2xl">UX</AvatarFallback>
                </Avatar>
                <div className="font-bold text-gray-900 text-lg">UX/UI</div>
                <div className="text-blue-600 font-medium">Tasarımcıları</div>
                <div className="text-sm text-gray-500 mt-2">Kullanıcı deneyimi</div>
              </div>
              
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 gradient-quaternary shadow-xl">
                  <AvatarFallback className="text-white font-bold text-2xl">GÜ</AvatarFallback>
                </Avatar>
                <div className="font-bold text-gray-900 text-lg">Güvenlik</div>
                <div className="text-green-600 font-medium">Uzmanları</div>
                <div className="text-sm text-gray-500 mt-2">Siber güvenlik</div>
              </div>
            </div>

            <div className="text-center bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🤝 Katkıda Bulunun</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Bu proje açık kaynak ruhuna uygun olarak topluluk katkılarıyla gelişmektedir. 
                Siz de bu önemli projeye katkıda bulunabilirsiniz!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="gradient-primary text-white font-bold px-8 py-3 shadow-xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                  🐙 GitHub'da Görüntüle
                </Button>
                <Button variant="outline" className="border-2 border-purple-300 text-purple-700 hover:bg-purple-50 px-8 py-3 font-bold">
                  📧 İletişime Geçin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <Card className="gradient-primary text-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="mb-8">
              <div className="text-6xl mb-4">🌟</div>
              <CardTitle className="text-4xl font-black mb-6">Birlikte Geleceği Şekillendirelim</CardTitle>
              <CardDescription className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
                Kamu kurumlarının dijital dönüşümüne katkıda bulunmak, vatandaş hizmetlerini iyileştirmek 
                ve açık kaynak topluluğuna destek olmak için bizimle iletişime geçin.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-4 text-lg font-bold shadow-xl transform hover:scale-105 transition-all duration-300">
                  🏠 Ana Sayfaya Dön
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-10 py-4 text-lg font-bold">
                📞 Proje Ekibiyle İletişim
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Separator className="my-12" />

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <Link href="/" className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <span className="font-bold text-xl">SM Yönetim</span>
              </Link>
              <p className="text-gray-300 text-sm leading-relaxed">
                Kamu kurumları için modern sosyal medya yönetim çözümü. Açık kaynak teknoloji ile güçlendirilmiş.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Ürün</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li><Button variant="link" className="text-gray-300 hover:text-white p-0 h-auto">Özellikler</Button></li>
                <li><Button variant="link" className="text-gray-300 hover:text-white p-0 h-auto">Güvenlik</Button></li>
                <li><Button variant="link" className="text-gray-300 hover:text-white p-0 h-auto">API Dokümantasyonu</Button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">Destek</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li><Button variant="link" className="text-gray-300 hover:text-white p-0 h-auto">Yardım Merkezi</Button></li>
                <li><Button variant="link" className="text-gray-300 hover:text-white p-0 h-auto">Katkıda Bulunma</Button></li>
                <li><Button variant="link" className="text-gray-300 hover:text-white p-0 h-auto">GitHub</Button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-lg">İletişim</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li>📧 Proje Ekibi</li>
                <li>🐛 GitHub Issues</li>
                <li>💬 Topluluk Forumu</li>
              </ul>
            </div>
          </div>
          <Separator className="my-10 bg-gray-700" />
          <div className="text-center text-sm text-gray-400">
            <p>&copy; 2024 Sosyal Medya Yönetimi. Açık kaynak lisansı altında. ❤️ ile geliştirildi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
