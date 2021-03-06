import {
  Component,
  NgZone,
  ViewChild
} from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Events,
  Platform
} from 'ionic-angular';
import {
  TabsPage,
  SharedPreferences,
  InteractType,
  InteractSubtype,
  Environment,
  PageId,
  ImpressionType,
  ContainerService,
  Profile,
  UserSource
} from 'sunbird';
import { TranslateService } from '@ngx-translate/core';
import {
  ProfileType,
  ProfileService
} from 'sunbird';
import { Map } from '../../app/telemetryutil';
import {
  initTabs,
  GUEST_TEACHER_TABS,
  GUEST_STUDENT_TABS
} from '../../app/module.service';
import { AppGlobalService } from '../../service/app-global.service';
import { TelemetryGeneratorService } from '../../service/telemetry-generator.service';
import { CommonUtilService } from '../../service/common-util.service';
import { PreferenceKey } from '../../app/app.constant';
import { SunbirdQRScanner } from '../qrscanner/sunbirdqrscanner.service';
import { ProfileSettingsPage } from '../profile-settings/profile-settings';
import { Navbar } from 'ionic-angular';
import { LanguageSettingsPage } from '../language-settings/language-settings';

const selectedCardBorderColor = '#006DE5';
const borderColor = '#F7F7F7';

@IonicPage()
@Component({
  selector: 'page-user-type-selection',
  templateUrl: 'user-type-selection.html',
})

export class UserTypeSelectionPage {
  @ViewChild(Navbar) navBar: Navbar;
  teacherCardBorderColor = '#F7F7F7';
  studentCardBorderColor = '#F7F7F7';
  userTypeSelected = false;
  selectedUserType: ProfileType;
  continueAs = '';
  profile: Profile;
  backButtonFunc = undefined;

  /**
   * Contains paths to icons
   */
  studentImageUri = 'assets/imgs/ic_student.png';
  teacherImageUri = 'assets/imgs/ic_teacher.png';
  isChangeRoleRequest = false;
  showScanner = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private translate: TranslateService,
    private preference: SharedPreferences,
    private profileService: ProfileService,
    private telemetryGeneratorService: TelemetryGeneratorService,
    private container: ContainerService,
    private zone: NgZone,
    private event: Events,
    private commonUtilService: CommonUtilService,
    private appGlobalService: AppGlobalService,
    private scannerService: SunbirdQRScanner,
    private platform: Platform
  ) { }

  ionViewDidLoad() {
    this.navBar.backButtonClick = (e: UIEvent) => {
      this.telemetryGeneratorService.generateBackClickedTelemetry(PageId.USER_TYPE_SELECTION, Environment.HOME, true);
      this.handleBackButton();
    };
    this.telemetryGeneratorService.generateImpressionTelemetry(
      ImpressionType.VIEW, '',
      PageId.USER_TYPE_SELECTION,
      Environment.HOME, '', '', '');

    this.event.subscribe('event:showScanner', (data) => {
      if (data.pageName === PageId.USER_TYPE_SELECTION) {
        this.scannerService.startScanner(PageId.USER_TYPE_SELECTION, true);
      }
    });
  }

  ionViewWillEnter() {
    this.profile = this.appGlobalService.getCurrentUser();
    this.isChangeRoleRequest = Boolean(this.navParams.get('isChangeRoleRequest'));
    this.showScanner = Boolean(this.navParams.get('showScanner'));
    if (this.showScanner) {
      this.scannerService.startScanner(PageId.USER_TYPE_SELECTION, true);
    }
    this.backButtonFunc = this.platform.registerBackButtonAction(() => {
      this.telemetryGeneratorService.generateBackClickedTelemetry(PageId.USER_TYPE_SELECTION, Environment.HOME, false);
      this.handleBackButton();
      this.backButtonFunc();
    }, 10);
  }

  ionViewWillLeave() {
    // Unregister the custom back button action for this page
    if (this.backButtonFunc) {
      this.backButtonFunc();
    }
  }

  handleBackButton() {
    if (this.isChangeRoleRequest) {
      this.navCtrl.pop();
    } else {
      this.navCtrl.setRoot(LanguageSettingsPage);
    }
  }

  selectTeacherCard() {
    this.selectCard('USER_TYPE_1', ProfileType.TEACHER);
  }

  selectStudentCard() {
    this.selectCard('USER_TYPE_2', ProfileType.STUDENT);
  }

  selectCard(userType, profileType) {
    this.zone.run(() => {
      this.userTypeSelected = true;
      this.teacherCardBorderColor = (userType === 'USER_TYPE_1') ? selectedCardBorderColor : borderColor;
      this.studentCardBorderColor = (userType === 'USER_TYPE_1') ? borderColor : selectedCardBorderColor;
      this.selectedUserType = profileType;
      this.continueAs = this.commonUtilService.translateMessage(
        'CONTINUE_AS_ROLE',
        this.commonUtilService.translateMessage(userType)
      );

      if (!this.isChangeRoleRequest) {
        this.preference.putString(PreferenceKey.SELECTED_USER_TYPE, this.selectedUserType);
      }
    });
  }

  continue() {
    this.generateInteractEvent(this.selectedUserType);

    // When user is changing the role via the Guest Profile screen
    if (this.profile !== undefined && this.profile.handle) {
      // if role types are same
      if (this.profile.profileType === this.selectedUserType) {
        this.gotoTabsPage();
      } else {
        this.gotoTabsPage(true);
/*         const updateRequest = new Profile();

        updateRequest.handle = this.profile.handle;
        updateRequest.avatar = this.profile.avatar;
        updateRequest.language = this.profile.language;
        updateRequest.uid = this.profile.uid;
        updateRequest.profileType = this.selectedUserType;
        updateRequest.createdAt = this.profile.createdAt;
        updateRequest.source = UserSource.LOCAL;

        updateRequest.syllabus = [];
        updateRequest.board = [];
        updateRequest.grade = [];
        updateRequest.subject = [];
        updateRequest.medium = [];

        this.updateProfile(updateRequest);
 */      }
    } else {
      const profileRequest = new Profile();
      profileRequest.handle = 'Guest1';
      profileRequest.profileType = this.selectedUserType;
      profileRequest.source = UserSource.LOCAL;
      this.setProfile(profileRequest);
    }
  }

  updateProfile(updateRequest: Profile) {
    this.profileService.updateProfile(updateRequest,
      () => {
        this.gotoTabsPage(true);
      },
      (err: any) => {
        console.error('Err', err);
      });
  }
  // TODO Remove getCurrentUser as setCurrentProfile is returning uid
  setProfile(profileRequest: Profile) {
    this.profileService.setCurrentProfile(true, profileRequest, () => {
      this.profileService.getCurrentUser(success => {
        const userId = JSON.parse(success).uid;
        this.event.publish(AppGlobalService.USER_INFO_UPDATED);
        if (userId !== 'null') {
          this.preference.putString('GUEST_USER_ID_BEFORE_LOGIN', userId);
        }
        this.gotoTabsPage();
      }, error => {
        console.error('Error', error);
        return 'null';
      });
    },
      err => {
        console.error('Error', err);
      });
  }

  /**
   * It will initializes tabs based on the user type and navigates to respective page
   * @param {boolean} isUserTypeChanged
   */
  gotoTabsPage(isUserTypeChanged: boolean = false) {
    // Update the Global variable in the AppGlobalService
    this.event.publish(AppGlobalService.USER_INFO_UPDATED);

    if (this.selectedUserType === ProfileType.TEACHER) {
      initTabs(this.container, GUEST_TEACHER_TABS);
    } else if (this.selectedUserType === ProfileType.STUDENT) {
      initTabs(this.container, GUEST_STUDENT_TABS);
    }

    if (this.isChangeRoleRequest && isUserTypeChanged) {
      this.container.removeAllTabs();
      this.navCtrl.push(ProfileSettingsPage, { isChangeRoleRequest: true, selectedUserType: this.selectedUserType });
    } else if (this.appGlobalService.isProfileSettingsCompleted) {
      this.navCtrl.push(TabsPage, {
        loginMode: 'guest'
      });
    } else {
      this.scannerService.startScanner(PageId.USER_TYPE_SELECTION, true);
    }
  }

  generateInteractEvent(userType) {
    const values = new Map();
    values['UserType'] = userType;
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.CONTINUE_CLICKED,
      Environment.HOME,
      PageId.USER_TYPE_SELECTION,
      undefined,
      values);
  }

}
