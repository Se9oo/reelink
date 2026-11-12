import { BackButton } from '@/widgets/privacy/ui/back-button';

const EFFECTIVE_DATE = '2026년 11월 9일';

export function PrivacyPolicy() {
	return (
		<main
			className="mx-auto w-full max-w-3xl px-4 pb-10 text-base leading-relaxed break-keep
				text-[var(--seed-color-fg-neutral)] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1
				[&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse
				[&_td]:border [&_td]:border-[var(--seed-color-stroke-neutral-subtle)] [&_td]:p-2 [&_td]:align-top [&_th]:border
				[&_th]:border-[var(--seed-color-stroke-neutral-subtle)] [&_th]:bg-[var(--seed-color-bg-neutral-weak)] [&_th]:p-2
				[&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5"
		>
			<header
				className="sticky top-0 -mx-4 mb-4 box-content flex h-14 items-center gap-1 bg-[var(--background)] px-2
					pt-[env(safe-area-inset-top)]"
			>
				<BackButton />
				<h1 className="text-[17px] font-bold">개인정보 처리방침</h1>
			</header>
			<p>
				Reelink 운영자(이하 &quot;운영자&quot;)는 Reelink(이하 &quot;서비스&quot;) 이용자의 개인정보를 「개인정보
				보호법」에 따라 보호하고, 관련 고충을 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
			</p>
			<p>시행일: {EFFECTIVE_DATE}</p>

			<h2>1. 개인정보의 처리 목적</h2>
			<p>
				운영자는 다음 목적을 위해 개인정보를 처리하며, 목적이 바뀌는 경우 사전에 동의를 받는 등 필요한 조치를 합니다.
			</p>
			<ol>
				<li>회원 식별 및 로그인: 소셜 로그인(카카오·구글·깃허브)을 통한 본인 식별, 로그인 상태 유지</li>
				<li>서비스 제공: 링크 저장·분류·검색, 리마인드 피드 제공, 휴지통 복구</li>
				<li>카카오톡 봇을 통한 링크 등록: 봇 채팅방과 서비스 계정의 연결</li>
				<li>리마인드 알림 발송: 카카오톡 &apos;나에게 보내기&apos;로 저장한 링크 알림 발송</li>
				<li>서비스 안정성 확보: 부정 이용 방지(게스트 계정 생성 제한 등), 오류 확인</li>
			</ol>

			<h2>2. 처리하는 개인정보 항목</h2>
			<table>
				<thead>
					<tr>
						<th>구분</th>
						<th>항목</th>
						<th>수집 시점</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>회원(소셜 로그인)</td>
						<td>이메일, 닉네임, 프로필 사진 URL, 소셜 서비스의 회원 식별자</td>
						<td>로그인 시</td>
					</tr>
					<tr>
						<td>서비스 이용</td>
						<td>저장한 링크의 URL·제목·썸네일, 저장 이유, 폴더 정보, 열람 여부</td>
						<td>링크 등록·이용 시</td>
					</tr>
					<tr>
						<td>카카오톡 봇 연동(선택)</td>
						<td>카카오톡 채널 이용자 식별값, 봇으로 보낸 메시지 내 URL</td>
						<td>봇 연동 및 메시지 전송 시</td>
					</tr>
					<tr>
						<td>카카오 알림 연동(선택)</td>
						<td>카카오 회원번호, 메시지 발송용 액세스·리프레시 토큰</td>
						<td>알림 연동 동의 시</td>
					</tr>
					<tr>
						<td>자동 수집</td>
						<td>접속 IP 주소, 접속 일시, 쿠키</td>
						<td>서비스 이용 시</td>
					</tr>
				</tbody>
			</table>

			<h2>3. 개인정보의 처리 및 보유 기간</h2>
			<p>
				운영자는 처리 목적이 달성되면 지체 없이 개인정보를 파기합니다. 다만 다음의 경우는 해당 기간 동안 보관합니다.
			</p>
			<table>
				<thead>
					<tr>
						<th>항목</th>
						<th>보유 기간</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>회원 정보 및 서비스 이용 정보</td>
						<td>회원 탈퇴 시까지</td>
					</tr>
					<tr>
						<td>삭제한 링크·폴더(휴지통)</td>
						<td>삭제 후 30일(이후 자동 영구 삭제)</td>
					</tr>
					<tr>
						<td>데이터베이스 백업</td>
						<td>생성 후 최대 14일</td>
					</tr>
				</tbody>
			</table>
			<p>
				데이터베이스는 장애 복구를 위해 백업되므로, 삭제한 정보도 백업본에는 최대 14일간 남아 있을 수 있습니다. 백업본은
				장애 복구 외의 목적으로 사용하지 않으며 보관 기간이 지나면 자동으로 삭제됩니다.
			</p>

			<h2>4. 개인정보의 제3자 제공</h2>
			<p>
				운영자는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 특별한 규정이 있는 경우는 예외로 합니다.
			</p>

			<h2>5. 개인정보 처리의 위탁</h2>
			<p>운영자는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
			<table>
				<thead>
					<tr>
						<th>수탁자</th>
						<th>위탁 업무</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Amazon Web Services, Inc. (Amazon Lightsail)</td>
						<td>서버 및 데이터베이스 운영</td>
					</tr>
					<tr>
						<td>Cloudflare, Inc.</td>
						<td>네트워크 전송(CDN·보안 프록시), 데이터베이스 백업 저장(R2)</td>
					</tr>
				</tbody>
			</table>

			<h2>6. 개인정보의 국외 이전</h2>
			<p>운영자는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전(보관)합니다.</p>
			<div className="overflow-x-auto">
				<table className="min-w-[640px]">
					<thead>
						<tr>
							<th>이전받는 자</th>
							<th>이전 국가</th>
							<th>이전 항목</th>
							<th>이전 일시·방법</th>
							<th>이용 목적 및 보유 기간</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Cloudflare, Inc. (privacy@cloudflare.com)</td>
							<td>미국 등 Cloudflare 데이터센터 소재 국가</td>
							<td>접속 IP 주소, 서비스 이용 중 전송되는 정보</td>
							<td>서비스 접속 시마다 네트워크를 통해 전송</td>
							<td>네트워크 전송·보안, 전송 후 즉시 처리</td>
						</tr>
						<tr>
							<td>Cloudflare, Inc. (privacy@cloudflare.com)</td>
							<td>아시아·태평양 지역 Cloudflare 데이터센터 소재 국가</td>
							<td>데이터베이스 백업에 포함된 2항의 항목 전체</td>
							<td>5분 간격 및 매일 1회 암호화 통신으로 전송</td>
							<td>장애 복구용 백업, 최대 14일</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p>
				국외 이전을 원하지 않는 경우 회원 탈퇴로 거부할 수 있습니다. 다만 위 이전은 서비스 제공에 필수적이므로, 거부하면
				서비스를 이용할 수 없습니다.
			</p>

			<h2>7. 개인정보의 파기 절차 및 방법</h2>
			<ul>
				<li>보유 기간이 지났거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.</li>
				<li>전자적 파일은 복구할 수 없는 방법으로 데이터베이스에서 영구 삭제합니다.</li>
				<li>휴지통 항목은 매일 자동 삭제 작업으로 파기합니다.</li>
			</ul>

			<h2>8. 이용자의 권리와 행사 방법</h2>
			<p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
			<ol>
				<li>개인정보 열람, 정정·삭제, 처리정지 요구</li>
				<li>
					카카오 알림 연동 해제: 서비스 설정에서 알림을 끄거나, 카카오 계정의 연결된 서비스 관리에서 연결을 끊을 수
					있습니다.
				</li>
				<li>회원 탈퇴: 서비스 설정 화면에서 직접 탈퇴할 수 있습니다.</li>
			</ol>
			<p>
				권리 행사는 아래 개인정보 보호책임자에게 이메일로 요청할 수 있으며, 운영자는 지체 없이(10일 이내) 조치합니다.
			</p>

			<h2>9. 개인정보 자동 수집 장치(쿠키)의 설치·운영 및 거부</h2>
			<p>운영자는 로그인 상태 유지와 보안(위조 요청 방지)을 위해 쿠키를 사용합니다.</p>
			<p>
				이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다. 다만 쿠키를 거부하면 로그인이 필요한 서비스를 이용할
				수 없습니다. 광고·행태정보 수집 목적의 쿠키는 사용하지 않습니다.
			</p>

			<h2>10. 개인정보의 안전성 확보 조치</h2>
			<ul>
				<li>모든 통신은 HTTPS로 암호화합니다.</li>
				<li>로그인 유지 토큰은 원문 대신 해시값으로 저장합니다.</li>
				<li>데이터베이스는 외부에서 직접 접속할 수 없는 내부 네트워크에 두고, 백업 저장소는 비공개로 운영합니다.</li>
				<li>서버 접근 권한은 운영자 본인으로 제한합니다.</li>
			</ul>

			<h2>11. 만 14세 미만 아동의 개인정보</h2>
			<p>서비스는 만 14세 이상만 이용할 수 있으며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다.</p>

			<h2>12. 개인정보 보호책임자</h2>
			<table>
				<tbody>
					<tr>
						<th>성명</th>
						<td>박세현</td>
					</tr>
					<tr>
						<th>연락처</th>
						<td>rreelink@gmail.com</td>
					</tr>
				</tbody>
			</table>

			<h2>13. 권익침해 구제 방법</h2>
			<p>개인정보 침해로 인한 구제를 받기 위해 아래 기관에 분쟁 해결이나 상담을 신청할 수 있습니다.</p>
			<ul>
				<li>개인정보분쟁조정위원회: (국번없이) 1833-6972, www.kopico.go.kr</li>
				<li>개인정보침해신고센터: (국번없이) 118, privacy.kisa.or.kr</li>
				<li>대검찰청: (국번없이) 1301, www.spo.go.kr</li>
				<li>경찰청: (국번없이) 182, ecrm.police.go.kr</li>
			</ul>

			<h2>14. 개인정보 처리방침의 변경</h2>
			<p>
				이 개인정보 처리방침은 시행일부터 적용되며, 내용이 추가·삭제·수정되는 경우 시행 7일 전부터 서비스 공지로
				알립니다.
			</p>
			<p>시행일: {EFFECTIVE_DATE}</p>
		</main>
	);
}
